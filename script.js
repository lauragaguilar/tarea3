// script.js — Las credenciales se cargan desde config.js (cargado antes en index.html)
// AZURE_CONFIG viene de config.js → nunca escribas las claves aquí directamente.

const fileInput      = document.getElementById("fileInput");
const dropzone       = document.getElementById("dropzone");
const uploadButton   = document.getElementById("uploadButton");
const previewImage   = document.getElementById("previewImage");
const identifyButton = document.getElementById("identifyButton");
const resultsSection = document.getElementById("resultsSection");

let currentImageBase64  = null;
let currentImageMimeType = "image/jpeg";

// ── Vista previa ───────────────────────────────────────────────
function updatePreview(file) {
  if (!file) return;
  currentImageMimeType = file.type || "image/jpeg";
  const reader = new FileReader();
  reader.onload = (event) => {
    previewImage.src     = event.target.result;
    previewImage.alt     = file.name;
    currentImageBase64   = event.target.result.split(",")[1];
  };
  reader.readAsDataURL(file);
}

function handleFiles(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  // Validación de tipo: jpg, png, gif
  const allowed = ["image/jpeg", "image/png", "image/gif"];
  if (!allowed.includes(file.type)) {
    alert("⚠️ Formato no admitido. Por favor sube una imagen JPG, PNG o GIF.");
    return;
  }
  updatePreview(file);
}

// ── Subida / Drag & Drop ───────────────────────────────────────
uploadButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add("drag-over");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove("drag-over");
  })
);
dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

// ── Llamada al agente Azure OpenAI ────────────────────────────
async function identifyBarbieWithAzure(imageBase64, mimeType) {
  const url = `${AZURE_CONFIG.endpoint}/openai/deployments/${AZURE_CONFIG.deploymentName}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

  const systemPrompt = `Eres un experto en muñecas Barbie de Mattel con décadas de experiencia coleccionando e identificando cada edición.
Cuando recibas una imagen de una Barbie, analízala con detalle y responde SIEMPRE en formato JSON válido con esta estructura exacta:

{
  "nombre": "Nombre oficial de la Barbie",
  "anio": "Año de lanzamiento (o rango si aplica)",
  "descripcion": "Descripción breve y emotiva de 2-3 oraciones",
  "caracteristicas": {
    "cabello": "descripción del cabello",
    "outfit": "descripción del atuendo",
    "accesorios": "lista de accesorios visibles",
    "curiosidad": "dato curioso o histórico relevante"
  },
  "valorColeccion": "Valor aproximado en mercado de coleccionista (USD, si es conocido)",
  "rareza": "Común | Poco común | Rara | Muy rara | Edición limitada",
  "confianza": "Alta | Media | Baja",
  "imagenesReferencia": [
    "término de búsqueda específico 1 para encontrar esta Barbie en Google Images",
    "término de búsqueda específico 2 (variante, caja original, etc.)",
    "término de búsqueda específico 3 (con accesorios o detalle especial)"
  ]
}

Los valores de "imagenesReferencia" deben ser términos de búsqueda en inglés muy específicos para Google Images,
por ejemplo: "Totally Hair Barbie 1992 Mattel original box", "Totally Hair Barbie blonde neon dress", etc.

Si la imagen NO muestra una Barbie, responde con:
{ "error": "No se detectó una Barbie en la imagen. Por favor sube una foto de tu muñeca Barbie." }

Responde SOLO con el JSON válido, sin texto adicional ni bloques de código markdown.`;

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
          },
          { type: "text", text: "Analiza esta imagen e identifica la Barbie con todos los detalles posibles." },
        ],
      },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_CONFIG.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Error Azure API (${response.status}): ${err?.error?.message || response.statusText}`);
  }

  const data    = await response.json();
  const rawText = data.choices[0].message.content.trim();
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

// ── Galería de imágenes de referencia ────────────────────────
function buildGallery(terminos) {
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";

  if (!terminos || terminos.length === 0) {
    // Fallback: mostrar SVGs originales
    ["img/barbie-thumb-1.svg", "img/barbie-thumb-2.svg", "img/barbie-thumb-3.svg"].forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Barbie referencia";
      grid.appendChild(img);
    });
    return;
  }

  terminos.slice(0, 3).forEach((termino) => {
    // Enlace a Google Images con ese término
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(termino)}`;

    // Usamos la API de imágenes de DuckDuckGo como proxy para previsualizar
    // (no requiere key, devuelve imagen directa vía og:image del primer resultado)
    // Como alternativa segura: mostramos una card con el término y enlace a Google Images
    const card = document.createElement("a");
    card.href   = searchUrl;
    card.target = "_blank";
    card.rel    = "noopener noreferrer";
    card.className = "gallery-search-card";
    card.title  = termino;

    card.innerHTML = `
      <div class="gallery-search-icon">🔍</div>
      <p class="gallery-search-term">${termino}</p>
      <span class="gallery-search-link">Ver en Google Images →</span>
    `;
    grid.appendChild(card);
  });
}

// ── Renderizar resultados ─────────────────────────────────────
function renderResults(result) {
  if (result.error) { showError(result.error); return; }

  document.getElementById("resultName").textContent        = result.nombre    || "Barbie desconocida";
  document.getElementById("resultYear").innerHTML          = `<strong>Año de lanzamiento:</strong> ${result.anio || "Desconocido"}`;
  document.getElementById("resultDescription").textContent = result.descripcion || "";

  const chars = result.caracteristicas || {};
  document.getElementById("resultHair").textContent        = chars.cabello    || "—";
  document.getElementById("resultOutfit").textContent      = chars.outfit     || "—";
  document.getElementById("resultAccessories").textContent = chars.accesorios || "—";
  document.getElementById("resultFact").textContent        = chars.curiosidad || "—";

  // Badges
  const extraEl = document.getElementById("resultExtra");
  let extraHTML  = "";
  if (result.rareza)         extraHTML += `<span class="badge badge-rareza">✨ ${result.rareza}</span>`;
  if (result.valorColeccion) extraHTML += `<span class="badge badge-valor">💰 ${result.valorColeccion}</span>`;
  if (result.confianza) {
    const cls = result.confianza === "Alta" ? "badge-high" : result.confianza === "Media" ? "badge-mid" : "badge-low";
    extraHTML += `<span class="badge ${cls}">🔍 Confianza: ${result.confianza}</span>`;
  }
  extraEl.innerHTML = extraHTML;

  // Galería dinámica
  buildGallery(result.imagenesReferencia);

  resultsSection.classList.remove("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

function showError(msg) {
  document.getElementById("resultName").textContent        = "⚠️ No identificada";
  document.getElementById("resultYear").textContent        = "";
  document.getElementById("resultDescription").textContent = msg;
  ["resultHair","resultOutfit","resultAccessories","resultFact"].forEach(
    (id) => (document.getElementById(id).textContent = "—")
  );
  document.getElementById("resultExtra").innerHTML = "";
  buildGallery(null);
  resultsSection.classList.remove("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth" });
}

// ── Botón de carga ─────────────────────────────────────────────
function setButtonLoading(loading) {
  if (loading) {
    identifyButton.disabled = true;
    identifyButton.dataset.original = identifyButton.textContent;
    identifyButton.innerHTML = `<span class="spinner"></span> Analizando...`;
  } else {
    identifyButton.disabled  = false;
    identifyButton.textContent = identifyButton.dataset.original || "Identificar Barbie";
  }
}

// ── Evento principal ───────────────────────────────────────────
identifyButton.addEventListener("click", async () => {
  if (!currentImageBase64) {
    alert("Por favor sube una foto de tu Barbie primero. 💕");
    return;
  }

  setButtonLoading(true);
  resultsSection.classList.add("hidden");

  try {
    const result = await identifyBarbieWithAzure(currentImageBase64, currentImageMimeType);
    renderResults(result);
  } catch (err) {
    console.error("Error al identificar:", err);
    showError(`Error al conectar con el agente de IA: ${err.message}`);
  } finally {
    setButtonLoading(false);
  }
});
