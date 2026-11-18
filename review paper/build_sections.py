# -*- coding: utf-8 -*-
import os

target = r'c:\Users\yuvra\OneDrive\Desktop\Deep Dhristi Project\current project files (with one model integrated )\DeepDrishti_eDNA_Review_Paper.tex'

def append_text(txt):
    with open(target, 'a', encoding='utf-8') as f:
        f.write(txt)

print('build_sections.py initialized')
