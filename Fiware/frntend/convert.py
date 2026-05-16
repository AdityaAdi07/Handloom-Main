import base64
from PIL import Image
from io import BytesIO

img = Image.open(r'c:\Users\sushm\OneDrive\Desktop\llm_engineering-main\Handloom-Twin\loom_3d\saree_images\923_vector_image.jpg')
img = img.resize((512, 512))
buffer = BytesIO()
img.save(buffer, format='JPEG', quality=80)
b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')

with open(r'c:\Users\sushm\OneDrive\Desktop\llm_engineering-main\Handloom-Twin\Fiware\frntend\texture_b64.js', 'w', encoding='utf-8') as f:
    f.write('const sareeTextureB64 = "data:image/jpeg;base64,' + b64_str + '";\n')
