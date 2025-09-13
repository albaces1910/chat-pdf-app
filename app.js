// --- CÓDIGO DEL FRONTEND ---
// Este archivo se encarga de la lógica de la página: leer el PDF,
// mostrar el chat y llamar a las funciones del backend.

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

        // Llama a la función para subir el archivo a la base de datos
        uploadFile(file); 

        // Muestra la interfaz del chat
        document.getElementById('upload-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        
        // Pide la primera pregunta al chatbot
        getAiQuestion();
    };

    reader.readAsArrayBuffer(file);
}

async function uploadFile(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        // Convierte el archivo a base64 para enviarlo en el cuerpo de la solicitud
        const base64File = reader.result.split(',')[1];

        try {
            // Llama a nuestra función serverless 'upload-pdf'
            const response = await fetch(`/.netlify/functions/upload-pdf`, {
                method: 'POST',
                body: JSON.stringify({
                    fileName: file.name,
                    fileBuffer: base64File
                })
            });
            if (!response.ok) {
                console.error("Error al subir el archivo.");
            } else {
                console.log("Archivo subido con éxito a la base de datos.");
            }
        } catch (error) {
            console.error("Error en la subida:", error);
        }
    };
}

async function getAiQuestion(userResponse = "") {
    const chatBox = document.getElementById('chat-box');
    
    const prompt = `
        **Tu Rol:** Eres un asistente de entrevistas inteligente y amigable. Tu objetivo es hacer preguntas basadas en el currículum de un usuario para simular una entrevista de trabajo.

        **Instrucciones de Conversación:**
        1.  **Regla de Salida:** Si la respuesta del usuario contiene frases como "no quiero seguir", "terminar", "parar", "cancelar" o "salir", debes despedirte amablemente y DEJAR de hacer preguntas. Por ejemplo: "Entendido, gracias por tu tiempo. ¡Que tengas un buen día!".
        2.  **Regla de "No Sé":** Si el usuario responde con "no sé", "no recuerdo" o algo similar, anímale a continuar y pasa a la siguiente pregunta. No insistas. Por ejemplo: "No te preocupes, sigamos con la siguiente pregunta."
        3.  **Regla por Defecto:** Si no se cumple ninguna de las reglas anteriores, haz la siguiente pregunta de la entrevista basándote en la información proporcionada.

        ---
        **Contexto (Currículum del Usuario):**
        ${pdfText}
        ---
        **Respuesta Anterior del Usuario:** "${userResponse}"
        ---
        **Tu Tarea:** Basado en las reglas y el contexto, proporciona tu siguiente respuesta.
    `;

    try {
        // Llama a nuestra función serverless 'ask-gemini'
        const response = await fetch(`/.netlify/functions/ask-gemini`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error de la API:', errorData);
            alert('Hubo un error con la API de Google. Revisa la consola para más detalles.');
            return;
        }

        const data = await response.json();
        const aiMessage = data.text;

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










