# 3D Building Models

Upload the building's 3D model here (used by the **3D Twin** page).

## Supported formats
- `.glb` (recommended — single self-contained binary file)
- `.gltf` (plus its `.bin` and texture files, kept together)

## Naming
Name the main file after the building so the viewer can reference it, e.g.:
 
```
public/models/main-building.glb
```

## How it's served
Anything in `public/` is served from the site root. A file at
`public/models/main-building.glb` is loaded in code as:
3
```js
const MODEL_URL = '/models/main-building.glb'
```

Once the file is uploaded, the 3D Twin page can point its model viewer at
this URL — no import or rebuild step needed for the asset itself.
