# Carrete 📷

Editor de fotos con look de película analógica (35mm), 100% en el navegador.
Mobile-first, sin backend: tus fotos nunca salen del dispositivo.

- **4 filtros:** Flash, Noche teal, Verano Kodak, Cálido nostálgico
- **6 ajustes:** intensidad, grano, calidez, desvanecido, viñeta, halación
- Render WebGL (grade → halación → grano + viñeta), descarga en JPG full-res
- Mantené presionada la foto para comparar con el original

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # tests (Vitest)
npm run build    # build de producción → dist/
```

## Deploy

Se publica solo en **GitHub Pages** vía GitHub Actions (`.github/workflows/deploy.yml`)
en cada push a `main`. El `base` de Vite se ajusta automáticamente al nombre del repo.
