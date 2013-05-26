
precision highp float;

uniform vec3 cam;
uniform vec3 lookat;
uniform vec2 resolution;
uniform vec4 fogColor;
uniform float fogDistance;
uniform vec3 light;
uniform vec3 lightColor;
uniform vec3 lightDistance;
uniform float fov;
uniform float camnear;
uniform float vWidth;
uniform float vHeight;
uniform float vDepth;
uniform sampler2D uSampler;


vec4 sample3D(in vec3 q) {
    float x = floor(q.x) / vWidth;
    float y = (floor(q.y)*vDepth + floor(q.z)) / (vDepth * vHeight);
    return texture2D(uSampler, vec2(x,y));
}

bool rayBoxIntersect(in vec3 origin, in vec3 direction, in vec3 boxMin, in vec3 boxMax, out float t0, out float t1) {
    vec3 omin = (boxMin - origin) / direction;
    vec3 omax = (boxMax - origin) / direction;
    vec3 imax = max(omax, omin);
    vec3 imin = min(omax, omin);
    t1 = min(imax.x, min(imax.y, imax.z));
    t0 = max(max(imin.x, 0.0), max(imin.y, imin.z));
    return t1 > t0;
}

void main(void) {
    vec3 front = normalize(lookat - cam);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), front));
    vec3 up = normalize(cross(front, right));

    // Abort if we're not in the rendering region of the frame buffer.
    float fracUp = gl_FragCoord.y/resolution.y; 
    if (fracUp > 1.0) {
        gl_FragColor = fogColor;
        return;
    }
    float fracRight = gl_FragCoord.x/resolution.x;
    if (fracRight > 1.0) {
        gl_FragColor = fogColor;
        return;
    }

    float vpw = 2.0 * camnear * tan(radians(fov*0.5));                             // viewport width
    float vph = vpw * resolution.y/resolution.x;                                   // viewport height
    vec3 vp0 = (cam + (front * camnear)) - (0.5 * vpw * right) - (0.5 * vph * up); // lower left point of viewport
    vec3 p0 = vp0 + (fracRight * vpw * right) + (fracUp * vph * up);               // the point on the vp corresponding to this pixel
    vec3 v = floor(p0);
    vec3 r = normalize(p0 - cam);

    // Prevent some artifacts.
    // XXX: Can we get away with the following? What if a component is -0.000001?
    r += 0.000001;

    // Initialize the marching inside the bounds.
    vec3 p1 = p0;
    if (p0.x < 0.0 || p0.x > vWidth - 1.0 || p0.y < 0.0 || p0.y > vHeight - 1.0 || p0.z < 0.0 || p0.z > vDepth - 1.0) {
        float t0, t1;
        if (!rayBoxIntersect(p0, r, vec3(0,0,0), vec3(vWidth, vHeight, vDepth), t0, t1)) {
            gl_FragColor = fogColor;
            return;
        }
        p1 = p0 + r * t0 + r * 0.0001;
        v = floor(p1);
    }

    
    vec3 step = sign(r);
    vec3 tMax = (((0.5+v) + 0.5*step) - p1)/r;
    vec3 tDelta = step/r;


    for (int iter = 0; iter < 2048; iter++) {
        vec4 col = sample3D(v);
        if (col.w == 1.0) {
            float t0, t1;
            if (!rayBoxIntersect(p0, r, v, v + vec3(1.0,1.0,1.0), t0, t1)) {
                gl_FragColor = fogColor;
                return;
            }
            vec3 pi = p0 + r * t0;
            vec3 d = pi - (v + vec3(0.5, 0.5, 0.5));
            vec3 absd = abs(d);
            vec3 normal;
            if (absd.y > absd.x && absd.y > absd.z) {
                normal = vec3(0, sign(d.y), 0);
            }
            else if (absd.x > absd.z) {
                normal = vec3(sign(d.x), 0, 0);
            }
            else {
                normal = vec3(0, 0, sign(d.z));
            }

            float mag = max(0.0, dot(normal, normalize(light - pi))); // point lighting
            float fog = min(1.0, length(pi - cam) / fogDistance); // fog
            gl_FragColor = vec4(col.r*mag * (1.0 - fog) + fog*fogColor.r, 
                                col.g*mag * (1.0 - fog) + fog*fogColor.g, 
                                col.b*mag * (1.0 - fog) + fog*fogColor.b, 1.0);
            return;
        }

        if (tMax.x < tMax.y) {
            if (tMax.x < tMax.z) {
                v.x += step.x;
                if (v.x >= vWidth || v.x < 0.0) {
                    gl_FragColor = fogColor;
                    return;
                }
                tMax.x += tDelta.x;
            }
            else {
                v.z += step.z;
                if (v.z >= vDepth || v.z < 0.0) {
                    gl_FragColor = fogColor;
                    return;
                }
                tMax.z += tDelta.z;
            }
        }
        else {
            if (tMax.y < tMax.z) {
                v.y += step.y;
                if (v.y >= vHeight || v.y < 0.0) {
                    gl_FragColor = fogColor;
                    return;
                }
                tMax.y += tDelta.y;
            }
            else {
                v.z += step.z;
                if (v.z >= vDepth || v.z < 0.0) {
                    gl_FragColor = fogColor;
                    return;
                }
                tMax.z += tDelta.z;
            }
        }
    }
    gl_FragColor = fogColor;            
}




