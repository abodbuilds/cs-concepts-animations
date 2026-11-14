"""Render the reusable Logic Workshop ceramic modules in Blender."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

out = Path(bpy.path.abspath('//')) if bpy.data.filepath else Path.cwd()
out = Path('/Users/abod/Desktop/projects/cs-concepts-animations/episodes/001-binary-search/source/ceramic')
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.world.color = (0.35, 0.35, 0.35)
bpy.ops.mesh.primitive_cube_add(size=2, location=(0,0,0))
cube=bpy.context.object
cube.name='Ceramic data module'
cube.scale=(1,0.82,1.12)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bevel=cube.modifiers.new('Soft machined edges','BEVEL')
bevel.width=0.11
bevel.segments=5
cube.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
material=bpy.data.materials.new('Matte ceramic')
material.use_nodes=True
shader=material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value=0.38
shader.inputs['Metallic'].default_value=0.05
cube.data.materials.append(material)
def light(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA', location=loc)
    obj=bpy.context.object
    obj.name=name
    obj.data.energy=power
    obj.data.shape='DISK'
    obj.data.size=size
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Large softbox',(-3,-4,7),500,5)
light('Soft fill',(4,-1,3),120,4)
light('Rim',(-2,4,5),200,3)
bpy.ops.object.camera_add(location=(3.4,-6.5,4.2))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=4.1
scene.camera=camera
def rgb(hexvalue):
    c=[int(hexvalue[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)+(1,)
for name,color in [('neutral','563269'),('active','F4D35E'),('found','E8A84B')]:
    shader.inputs['Base Color'].default_value=rgb(color)
    scene.render.filepath=str(out/f'{name}.png')
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'logic-workshop.blend'))
print('Rendered three ceramic module assets.')
