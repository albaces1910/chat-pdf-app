// Este código se ejecuta en el servidor de Netlify, no en el navegador del usuario.
exports.handler = async function (event) {
  // Solo aceptamos solicitudes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    // Obtenemos la clave secreta que guardaste en Netlify
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("La clave de API de Gemini no está configurada en las variables de entorno de Netlify.");
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error desde la API de Google:', errorData);
        return {
            statusCode: response.status,
            body: JSON.stringify(errorData),
        };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error en la función serverless:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Hubo un error interno en el servidor.' }),
    };
  }
};

