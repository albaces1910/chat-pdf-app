// ¡La clave de API ha sido eliminada de aquí para mayor seguridad!
let pdfText = '';

// Configura el worker para la librería pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

async function startChat() {
    const fileInput = document.getElementById('pdf-upload');
    if (fileInput.files.length === 0) {
        alert('Por favor, selecciona un archivo PDF.');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(event) {
        const typedarray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
        }
        pdfText = text;
        document.getElementById('upload-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        getAiQuestion();
    };
    reader.readAsArrayBuffer(file);
}

async function getAiQuestion(userResponse = "") {
    const chatBox = document.getElementById('chat-box');
    const prompt = `
        **Tu Rol:** Eres un asistente de entrevistas que hace preguntas sobre un PDF proporcionado por el usuario.
        **Contexto:**
        - PDF del usuario: --- ${pdfText} ---
        - Última respuesta del usuario: "${userResponse}"
        **Reglas de Conversación (¡MUY IMPORTANTE!):**
        1. SI el usuario expresa claramente que quiere detener o terminar la entrevista (ej: "no quiero seguir", "terminemos", "adiós", "basta"), tu ÚNICA respuesta debe ser un mensaje de despedida corto y amable como: "Entendido. Gracias por tu tiempo. ¡Que tengas un buen día!". NO HAGAS OTRA PREGUNTA.
        2. SI el usuario dice que no sabe la respuesta (ej: "no sé", "no recuerdo"), responde amablemente "No te preocupes, continuemos." y LUEGO formula la siguiente pregunta relevante.
        3. SI NINGUNA de las reglas anteriores aplica, entonces tu tarea principal es: formular la siguiente pregunta de la entrevista basándote en el PDF y la respuesta anterior del usuario.
        **Tu Tarea Ahora:** Evalúa la "Última respuesta del usuario" y actúa según las "Reglas de Conversación".
    `;

    try {
        // Ahora llamamos a nuestra propia función serverless, no a Google directamente.
        const response = await fetch(`/.netlify/functions/ask-gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error desde la función serverless:', errorData);
            alert('Hubo un error con la API. Revisa la consola.');
            return;
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            console.error('Respuesta sin candidatos:', data);
            alert('La IA no generó una respuesta.');
            return;
        }
        const aiMessage = data.candidates[0].content.parts[0].text;
        const aiMessageElement = document.createElement('p');
        aiMessageElement.innerHTML = `<strong>Asistente:</strong> ${aiMessage}`;
        chatBox.appendChild(aiMessageElement);
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (error) {
        console.error('Error al contactar la función serverless:', error);
        alert('Hubo un error al obtener la pregunta del asistente.');
    }
}

function sendMessage() {
    const userMessageInput = document.getElementById('user-message');
    const userMessage = userMessageInput.value.trim();
    if (userMessage === '') return;
    const chatBox = document.getElementById('chat-box');
    const userMessageElement = document.createElement('p');
    userMessageElement.innerHTML = `<strong>Tú:</strong> ${userMessage}`;
    chatBox.appendChild(userMessageElement);
    userMessageInput.value = '';
    getAiQuestion(userMessage);
}









