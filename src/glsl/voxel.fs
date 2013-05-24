
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


vec4 sample3D(vec3 p) {
    //XXX: Should we be adding 0.5 to the floored values?
    float x = floor(p.x)/vWidth;
    float y = (floor(p.y)*vDepth + floor(p.z)) / (vDepth * vHeight);
    return texture2D(uSampler, vec2(x,y));
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

    float vpw = 2.0 * camnear * tan(radians(fov*0.5));                                  // viewport width
    float vph = vpw * resolution.y/resolution.x;                                        // viewport height
    lowp vec3 vp0 = (cam + (front * camnear)) - (0.5 * vpw * right) - (0.5 * vph * up); // lower left point of viewport
    lowp vec3 p = vp0 + (fracRight * vpw * right) + (fracUp * vph * up);                // current position along ray
    lowp vec3 c = floor(p) + vec3(0.5, 0.5, 0.5);                                       // center of current block
    lowp vec3 lastBlock = c;
    lowp vec3 r = normalize(p - cam);

    // Artifacts arise when a component of r is identically zero. Add an imperceptible 
    // amount to r to prevent this. XXX: There has got to be a better way to deal with this.
    if (r.x == 0.0) {
        r.x = 0.000001;
    }
    if (r.y == 0.0) {
        r.y = 0.000001;
    }
    if (r.z == 0.0) {
        r.z = 0.000001;
    }

    // XXX: Can we get away with the following? What if a component is -0.000001?
    // r += 0.000001;

    // Keep the ray in the scene box.
    if (p.x < 0.0 || p.x > vWidth || p.y < 0.0 || p.y > vHeight || p.z < 0.0 || p.z > vDepth) {
        float tmin = -p.x/r.x;
        float tmax = (vWidth - p.x) / r.x;
        if (tmin > tmax) {
            float temp = tmin;
            tmin = tmax;
            tmax = temp;
        }
        float tymin = -p.y/r.y;
        float tymax = (vHeight - p.y)/r.y;
        if (tymin > tymax) {
            float temp = tymin;
            tymin = tymax;
            tymax = temp;
        }
        if (tmin > tymax || tymin > tmax) {
            gl_FragColor = fogColor;
            return;
        }
        tmin = max(tymin, tmin);
        tmax = min(tymax, tmax);
        float tzmin = -p.z/r.z;
        float tzmax = (vDepth - p.z)/r.z;
        if (tzmin > tzmax) {
            float temp = tzmin;
            tzmin = tzmax;
            tzmax = temp;
        }
        if (tmin > tzmax || tzmin > tmax) {
            gl_FragColor = fogColor;
            return;
        }
        tmin = max(tmin, tzmin);
        if (tmin < 0.0) {
            gl_FragColor = fogColor;
            return;
        }
        p = p + r*tmin + r*0.001;
        if (tmin == tymin) {
            c = floor(vec3(p.x, p.y + 0.1 * sign(r.y), p.z)) + vec3(0.5, 0.5, 0.5);
            lastBlock = floor(vec3(p.x, p.y + 0.1 * -sign(r.y), p.z)) + vec3(0.5, 0.5, 0.5);
        }
        else if (tmin == tzmin) {
            c = floor(vec3(p.x, p.y, p.z + 0.1 * sign(r.z))) + vec3(0.5, 0.5, 0.5);
            lastBlock = floor(vec3(p.x, p.y, p.z + 0.1 * -sign(r.z))) + vec3(0.5, 0.5, 0.5);
        }
        else {
            c = floor(vec3(p.x + 0.1 * sign(r.x), p.y, p.z)) + vec3(0.5, 0.5, 0.5);
            lastBlock = floor(vec3(p.x + 0.1 * -sign(r.x), p.y, p.z)) + vec3(0.5, 0.5, 0.5);
        }
    }

    vec3 n = sign(r) * 0.5;
    vec3 invr = 1.0/r;

    // March!
    for (int step = 0; step < 2048; step++) {
        if (c.x > vWidth || c.x < 0.0 || c.y > vHeight || c.y < 0.0 || c.z > vDepth || c.z < 0.0) {
            gl_FragColor = fogColor;
            return;
        }
        vec4 col = sample3D(c);
        if (col.w == 1.0) {
            float mag = max(0.0, dot(lastBlock - c, normalize(light - p))); // point lighting
            float fog = min(1.0, length(p - cam) / fogDistance); // fog
            gl_FragColor = vec4(col.r*mag * (1.0 - fog) + fog*fogColor.r, 
                                col.g*mag * (1.0 - fog) + fog*fogColor.g, 
                                col.b*mag * (1.0 - fog) + fog*fogColor.b, 1.0);
            return;
        }
        lastBlock = c;
        vec3 d = (c + n) - p;
        vec3 T = d * invr;
        float t = min(T.x, T.y); t = min(t, T.z);
        p += r * t;
        if (t == T.x) {
            c.x += n.x * 2.0;
        }
        else if (t == T.y) {
            c.y += n.y * 2.0;
        }
        else {
            c.z += n.z * 2.0;
        }
        c = floor(c) + vec3(0.5, 0.5, 0.5);
    }
}
