# Identifica tu Barbie — con Agente de IA (Azure OpenAI)

## Descripción
Aplicación web que permite subir una foto de una muñeca Barbie y usar un **agente de IA con visión** (Azure OpenAI GPT-4o) para identificarla automáticamente, obteniendo nombre, año, características, rareza y valor de coleccionista.

## Arquitectura del agente
```
Usuario sube imagen
       ↓
  FileReader API  →  base64
       ↓
Azure OpenAI GPT-4o  (vision, system prompt experto en Barbies)
       ↓
   JSON estructurado
       ↓
  Renderizado en la UI
```

## Configuración (paso a paso)

### 1. Crear recurso en Azure
1. Ve a [portal.azure.com](https://portal.azure.com)
2. Busca **"Azure OpenAI"** → Crear recurso
3. Elige la suscripción, grupo de recursos y región
4. Crea el recurso y espera el despliegue

### 2. Crear un deployment de GPT-4o
1. Abre tu recurso de Azure OpenAI
2. Ve a **Azure OpenAI Studio** → **Deployments** → **Create new deployment**
3. Selecciona el modelo: `gpt-4o` (con capacidad de visión)
4. Anota el **nombre del deployment** que asignes

### 3. Obtener credenciales
En el recurso de Azure OpenAI (Portal de Azure):
- **Endpoint**: sección "Keys and Endpoint" → campo "Endpoint"
- **API Key**: sección "Keys and Endpoint" → "Key 1" o "Key 2"

### 4. Configurar el proyecto
Crea un archivo `config.js` y reemplaza los valores en `AZURE_CONFIG`:

```javascript
const AZURE_CONFIG = {
  endpoint: "https://MI-RECURSO.openai.azure.com",  // ← tu endpoint real
  apiKey: "abc123...xyz",                            // ← API Key 
  deploymentName: "gpt-4o",                         // ← nombre del deployment
  apiVersion: "2024-02-15-preview",
};
```

### 5. Ejecutar
Abre `index.html` directamente en el navegador (no requiere servidor).

> ⚠️ **Nota CORS**: Si el navegador bloquea la petición por CORS, sirve el proyecto con un servidor local:
> ```bash
> # Con Python
> python -m http.server 5500
> # Con VS Code: instala "Live Server" y clic en "Go Live"
> ```

## Estructura del proyecto
```
tarea2/
├── index.html     # UI principal (actualizada con IDs para el agente)
├── script.js      # Lógica + integración con Azure OpenAI
├── styles.css     # Estilos + spinner + badges
├── img/           # SVGs de referencia
└── README.md      # Este archivo
```

## Tecnologías
- HTML5 / CSS3 / JavaScript (Vanilla, sin dependencias)
- Azure OpenAI GPT-4o con visión (image_url en base64)
- FileReader API para preview y conversión a base64
