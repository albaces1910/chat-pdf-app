// --- BACKEND PARA COMUNICARSE CON GEMINI ---
// Este código se ejecuta en Netlify. Se conecta a la API de Gemini de forma segura
// usando la variable de entorno para la clave de API.

exports.handler = async function (event) {
  // Solo permitir solicitudes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Obtener la clave de API de Gemini desde las variables de entorno de Netlify
    const API_KEY = process.env.GEMINI_API_KEY;
    const { prompt } = JSON.parse(event.body);

    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // Realizar la llamada a la API de Gemini
    const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "contents": [{"parts":[{"text": prompt}]}]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error de la API de Gemini:', errorData);
        return {
            statusCode: response.status,
            body: JSON.stringify({ error: 'Falló la llamada a la API de Gemini.' }),
        };
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Si todo fue exitoso, devolver la respuesta de la IA
    return {
        statusCode: 200,
        body: JSON.stringify({ text: text }),
    };

  } catch (error) {
    // Si algo falla, registrar el error y devolver una respuesta de error
    console.error('Error en la función ask-gemini:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error interno del servidor.' }),
    };
  }
};

