
import os
import glob

# Build shaders.js

filenames = glob.glob("../src/glsl/*.fs") + glob.glob("../src/glsl/*.vs")

compiled = open("shaders.js", 'w')

compiled.write("\n")
compiled.write('"use strict";\n\n')
compiled.write("Voxgrind.shaders = {};\n\n\n")

for filename in filenames:
    compiled.write("Voxgrind.shaders['%s'] = [\n" % os.path.basename(filename))
    lines = open(filename, 'r').readlines()
    for i in range(len(lines)):
        lines[i] = '    "%s"' % lines[i].replace("\n", "")
    compiled.write(",\n".join(lines))
    compiled.write("\n].join('\\n');\n\n\n\n")

compiled.close()

# Build voxgrind.js

filenames = glob.glob("../src/js/*.js")
filenames.remove("../src/js/core.js")
filenames.insert(0, "../src/js/core.js")
filenames.append("./shaders.js")

compiled = open("voxgrind.js", 'w')

for filename in filenames:
	lines = ''.join(open(filename, 'r').readlines())
	compiled.write(lines)

compiled.close()
