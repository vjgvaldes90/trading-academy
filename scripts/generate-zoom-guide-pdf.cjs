/**
 * Generates public/docs/smart-option-zoom-setup.pdf
 * Run: npm run generate:zoom-guide-pdf
 */

const fs = require("fs")
const path = require("path")
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib")

const W = 595
const H = 842
const M = 50
const HEADER_H = 72
const FOOTER_Y = 36
const LINE = 12
const SIZE_P = 10
const SIZE_H3 = 11
const SIZE_TITLE = 13

const BG_TOP = rgb(0.04, 0.07, 0.15)
const BAR = rgb(0.23, 0.51, 0.96)
const ON_DARK = rgb(0.94, 0.96, 1)
const BODY = rgb(0.13, 0.15, 0.2)
const MUTED = rgb(0.38, 0.42, 0.5)
const H3_COLOR = rgb(0.09, 0.16, 0.38)

function wrap(text, font, size, maxW) {
    const words = String(text).split(/\s+/)
    const lines = []
    let cur = ""
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w
        if (font.widthOfTextAtSize(test, size) <= maxW || !cur) cur = test
        else {
            lines.push(cur)
            cur = w
        }
    }
    if (cur) lines.push(cur)
    return lines
}

async function main() {
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

    function drawHeader(pg, heading) {
        pg.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: BG_TOP })
        pg.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: BAR })
        pg.drawText("Smart Option Academy", {
            x: M,
            y: H - 28,
            size: 8,
            font,
            color: ON_DARK,
        })
        wrap(heading, fontBold, SIZE_TITLE, W - 2 * M).forEach((ln, i) => {
            pg.drawText(ln, {
                x: M,
                y: H - 52 - i * (LINE + 2),
                size: SIZE_TITLE,
                font: fontBold,
                color: ON_DARK,
            })
        })
    }

    /** @returns {number} next y */
    function drawParagraph(pg, text, y, maxW = W - 2 * M) {
        const lines = wrap(text, font, SIZE_P, maxW)
        for (const ln of lines) {
            if (y < M + 56) return y
            pg.drawText(ln, { x: M, y, size: SIZE_P, font, color: BODY })
            y -= LINE
        }
        return y - 6
    }

    function drawH3(pg, text, y) {
        if (y < M + 56) return y
        wrap(text, fontBold, SIZE_H3, W - 2 * M).forEach((ln, i) => {
            pg.drawText(ln, {
                x: M,
                y: y - i * LINE,
                size: SIZE_H3,
                font: fontBold,
                color: H3_COLOR,
            })
        })
        const lines = wrap(text, fontBold, SIZE_H3, W - 2 * M)
        return y - lines.length * LINE - 10
    }

    function drawBullets(pg, items, y, numbered) {
        items.forEach((item, idx) => {
            const prefix = numbered ? `${idx + 1}. ` : "• "
            const lines = wrap(prefix + item, font, SIZE_P, W - 2 * M - 12)
            lines.forEach((ln, li) => {
                if (y < M + 56) return
                pg.drawText(ln, {
                    x: M + (li > 0 ? 10 : 0),
                    y,
                    size: SIZE_P,
                    font,
                    color: BODY,
                })
                y -= LINE
            })
            y -= 4
        })
        return y
    }

    // -------- Cover
    let pg = pdf.addPage([W, H])
    pg.drawRectangle({ x: 0, y: H - 240, width: W, height: 240, color: BG_TOP })
    pg.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BAR })
    const coverTitle = "Smart Option Academy - Guía de Configuración Zoom Premium"
    const titleLines = wrap(coverTitle, fontBold, 18, W - 2 * M)
    const titleStartY = H - 100
    titleLines.forEach((ln, i) => {
        pg.drawText(ln, {
            x: M,
            y: titleStartY - i * 22,
            size: 18,
            font: fontBold,
            color: ON_DARK,
        })
    })
    pg.drawText("Documento oficial para estudiantes · Educación financiera institucional", {
        x: M,
        y: titleStartY - titleLines.length * 22 - 28,
        size: 10,
        font,
        color: rgb(0.72, 0.8, 0.96),
    })
    pg.drawText("Versión 1.0 · 2026", { x: M, y: M + 40, size: 9, font, color: MUTED })

    const segments = [
        {
            head: "1. Descarga del cliente Zoom (escritorio)",
            parts: [
                { t: "h3", v: "Experiencia institucional" },
                {
                    t: "p",
                    v: "En Smart Option Academy recomendamos la aplicación de Zoom para escritorio (Windows o macOS): mejor estabilidad de audio y vídeo, menor retardo y lectura más nítida de gráficos y pantalla compartida frente al navegador.",
                },
                { t: "h3", v: "Descarga oficial" },
                {
                    t: "p",
                    v: "Visite zoom.us/download y descargue el cliente de reuniones para su sistema. Instale únicamente desde el sitio oficial de Zoom.",
                },
                {
                    t: "bullet",
                    items: [
                        "Windows: ejecute el instalador y siga el asistente.",
                        "macOS: use el paquete .pkg y complete la instalación en Aplicaciones.",
                        "Reinicie si el instalador lo recomienda tras actualizaciones del sistema.",
                    ],
                },
            ],
        },
        {
            head: "2. Instalación y primera ejecución",
            parts: [
                { t: "h3", v: "Pasos recomendados" },
                {
                    t: "num",
                    items: [
                        "Abra Zoom e inicie sesión (puede crear una cuenta gratuita en zoom.us).",
                        "Autorice micrófono y cámara cuando el sistema operativo lo solicite.",
                        "Ajustes > Audio: use \"Probar altavoz / micrófono\" antes de la clase.",
                        "Ajustes > Vídeo: confirme la cámara correcta y la vista previa.",
                        "Si usa antivirus o firewall corporativo, permita Zoom en redes privadas.",
                    ],
                },
                {
                    t: "p",
                    v: "Mantenga Zoom actualizado: menú principal > Buscar actualizaciones. Las versiones recientes corrigen errores de audio y compatibilidad.",
                },
            ],
        },
        {
            head: "3. Optimización de audio y vídeo",
            parts: [
                { t: "h3", v: "Audio" },
                {
                    t: "bullet",
                    items: [
                        "Auriculares con micrófono reducen eco y ruido ambiente.",
                        "Active la supresión de ruido en Ajustes > Audio si trabaja en espacio ruidoso.",
                        "Evite altavoces a alto volumen para prevenir realimentación.",
                    ],
                },
                { t: "h3", v: "Vídeo" },
                {
                    t: "bullet",
                    items: [
                        "Iluminación frontal suave; evite ventanas muy luminosas detrás suyo.",
                        "Si la conexión es inestable, desactive la cámara y mantenga audio.",
                        "Use pantalla completa al seguir gráficos compartidos.",
                    ],
                },
                {
                    t: "p",
                    v: "Preferible conexión por cable Ethernet o Wi-Fi 5 GHz para sesiones largas con pantalla compartida.",
                },
            ],
        },
        {
            head: "4. Buenas prácticas en clases de trading",
            parts: [
                { t: "h3", v: "Antes de entrar en vivo" },
                {
                    t: "bullet",
                    items: [
                        "Conéctese con margen de tiempo desde la plataforma Smart Option Academy.",
                        "Cierre descargas pesadas y streaming que compitan por ancho de banda.",
                        "Tenga a mano su bitácora o plantilla de gestión de riesgo.",
                    ],
                },
                { t: "h3", v: "Durante la sesión" },
                {
                    t: "bullet",
                    items: [
                        "Use \"Levantar la mano\" si la sala lo permite; respete el orden del mentor.",
                        "No comparta enlaces de reunión: el acceso es personal y educativo.",
                        "Las decisiones de inversión son suyas; el contenido es formativo, no asesoría personalizada.",
                    ],
                },
                {
                    t: "p",
                    v: "Smart Option Academy imparte educación financiera de alto nivel. No se garantizan resultados de mercado.",
                },
            ],
        },
        {
            head: "5. Solución de problemas",
            parts: [
                { t: "h3", v: "Qué revisar primero" },
                {
                    t: "bullet",
                    items: [
                        "Sin audio: dispositivo correcto en Zoom y en el sistema; pruebe auriculares.",
                        "Cortes de vídeo: baje calidad o apague cámara; compruebe velocidad de red.",
                        "No puede unirse: valide horario, sesión activa y enlace desde la academia.",
                        "La aplicación no abre: reinstale desde zoom.us/download y reinicie el equipo.",
                    ],
                },
                {
                    t: "p",
                    v: "Si necesita ayuda, contacte al soporte de Smart Option Academy con sistema operativo, versión de Zoom y captura del mensaje de error.",
                },
            ],
        },
    ]

    for (const seg of segments) {
        pg = pdf.addPage([W, H])
        drawHeader(pg, seg.head)
        let y = H - HEADER_H - 32

        const newPage = () => {
            pg = pdf.addPage([W, H])
            drawHeader(pg, `${seg.head} (continuación)`)
            y = H - HEADER_H - 32
        }

        for (const part of seg.parts) {
            if (part.t === "h3") y = drawH3(pg, part.v, y)
            else if (part.t === "p") {
                const lines = wrap(part.v, font, SIZE_P, W - 2 * M)
                let need = lines.length * LINE + 20
                if (y - need < M + 48) newPage()
                y = drawParagraph(pg, part.v, y)
            } else if (part.t === "bullet") {
                const approx = part.items.length * 3 * LINE
                if (y - approx < M + 48) newPage()
                y = drawBullets(pg, part.items, y, false)
            } else if (part.t === "num") {
                const approx = part.items.length * 3 * LINE
                if (y - approx < M + 48) newPage()
                y = drawBullets(pg, part.items, y, true)
            }
        }
    }

    const total = pdf.getPageCount()
    const footFont = await pdf.embedFont(StandardFonts.Helvetica)
    for (let i = 0; i < total; i++) {
        const page = pdf.getPage(i)
        const label = `Página ${i + 1} de ${total} · Smart Option Academy · Uso exclusivo estudiantes`
        page.drawText(label, {
            x: M,
            y: FOOTER_Y,
            size: 8,
            font: footFont,
            color: MUTED,
        })
    }

    const outDir = path.join(__dirname, "..", "public", "docs")
    const outPath = path.join(outDir, "smart-option-zoom-setup.pdf")
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(outPath, await pdf.save())
    console.log("OK:", outPath, `(${total} páginas)`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
