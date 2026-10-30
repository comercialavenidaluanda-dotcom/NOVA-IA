export default async function handler(_req, res) {
  return res.status(501).json({
    error: "A renderização FFmpeg ainda não está disponível no site web. O editor web permite importar e preparar clips; o motor de exportação online será ligado numa etapa própria."
  });
}
