// --- NUEVA VERSIÓN PARA CONECTARSE A SUPABASE ---
const { createClient } = require('@supabase/supabase-js');

// La función Buffer no está disponible globalmente en Netlify, la importamos.
const { Buffer } = require('buffer');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Obtenemos las credenciales secretas de Netlify
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    // Creamos el cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { fileName, fileBuffer } = JSON.parse(event.body);
    const buffer = Buffer.from(fileBuffer, 'base64');
    
    const filePath = `public/${Date.now()}-${fileName}`;

    // 1. Subimos el archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('pdfs') // El nombre de nuestro bucket
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 2. Guardamos la información en la tabla 'documents' de la base de datos
    const { error: insertError } = await supabase
      .from('documents') // El nombre de nuestra tabla
      .insert([{ name: fileName, file_path: filePath }]);

    if (insertError) {
      throw insertError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Archivo subido con éxito a Supabase' }),
    };
  } catch (error) {
    console.error('Error en la función de Supabase:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
