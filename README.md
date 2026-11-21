# Nuvio-Providers-Personalizado

Addon de proveedores para **Nuvio Media Hub**.

## Proveedor

| Proveedor | Web | Estado |
|---|---|---|
| EstrenosCinesaa | https://www.estrenoscinesaa.com/ | Búsqueda WordPress y resolución de vídeos de YouTube permitidos |

## Funcionamiento

El proveedor implementa `getStreams(tmdbId, mediaType, season, episode)`. Busca el identificador TMDB en la búsqueda REST de WordPress del sitio, abre los resultados internos y recoge únicamente reproductores de YouTube / YouTube-nocookie.

**Limitación:** esta integración puede devolver tráileres alojados en YouTube. No extrae enlaces de UqLoad, StreamTape, Playmogo ni otros alojamientos externos, y no garantiza encontrar una película o episodio completo. Si la búsqueda de WordPress no indexa el TMDB ID, devuelve una lista vacía.

## Prueba manual

```bash
node test.js 550 movie estrenoscinesa
node test.js 1396 tv 1 1 estrenoscinesa
```

La implementación se ha añadido sin ejecutar pruebas de integración, por petición del usuario. Compatibilidad objetivo: Hermes JS / FireTV.
