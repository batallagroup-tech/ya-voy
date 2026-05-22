import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export const getFoodRecommendations = async (profile: any, products: Product[], primaryAddress?: string) => {
  try {
    const prompt = `
      Eres un asistente de IA personalizado para una aplicación de delivery llamada "Ya Voy!".
      Tu objetivo es recomendar comida o productos al usuario basándote en su perfil y ubicación.
      
      Perfil del usuario:
      - Nombre: ${profile?.displayName || 'Usuario'}
      - Preferencias: ${profile?.preferences?.join(', ') || 'Sin preferencias específicas'}
      - Verificado: ${profile?.verificado ? 'Sí' : 'No'}
      - Ubicación actual (Preferida): ${primaryAddress || 'No especificada'}
      
      Productos disponibles:
      ${products.map(p => `- ${p.name} (${p.sub}): ${p.desc} - $${p.price}`).join('\n')}
      
      Instrucciones:
      1. Saluda brevemente al usuario de forma amigable y profesional.
      2. Recomienda 2 o 3 productos que coincidan con sus preferencias o que sean populares en su zona (${primaryAddress || 'su ubicación'}).
      3. Explica brevemente por qué los recomiendas (menciona que son buenas opciones para entregar en ${primaryAddress || 'su domicilio'}).
      4. Mantén un tono entusiasta y servicial.
      5. Responde en formato JSON con la siguiente estructura:
      {
        "greeting": "Hola [Nombre]...",
        "recommendations": [
          {
            "productId": "string",
            "reason": "..."
          }
        ],
        "tips": ["Consejo 1", "Consejo 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text1 = response.text || "{}";
    const jsonMatch1 = text1.match(/\{[\s\S]*\}/);
    const cleanJson1 = jsonMatch1 ? jsonMatch1[0] : text1.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson1);
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    return null;
  }
};

export const getQuickHelp = async (query: string, products: Product[]) => {
  try {
    const prompt = `
      Eres un asistente de ayuda inteligente para "Ya Voy!".
      El usuario dice: "${query}"
      
      Tu tarea es:
      1. Responder a su duda o comentario de forma empática, concisa y útil.
      2. Si el usuario menciona un malestar físico (como cólicos, dolor de cabeza, etc.), hambre, antojo o una situación específica, busca en el catálogo de productos proporcionado algo que pueda ayudarle o complementar su situación.
      3. Si encuentras productos relevantes, inclúyelos en la respuesta.
      
      Catálogo de productos:
      ${products.map(p => `- ID: ${p.id}, Nombre: ${p.name}, Categoría: ${p.sub}, Descripción: ${p.desc}`).join('\n')}
      
      Ejemplos:
      - Usuario: "Tengo cólicos" -> Responder con empatía y recomendar pastillas para el dolor si están en el catálogo.
      - Usuario: "Voy a cenar pollo" -> Sugerir una bebida fría como una Coca-Cola.
      - Usuario: "¿Cómo pido?" -> Explicar el proceso brevemente.
      
      Responde estrictamente en formato JSON:
      {
        "answer": "Tu respuesta de texto aquí...",
        "recommendations": [
          {
            "productId": "string",
            "reason": "Por qué lo recomiendas"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: prompt,
        responseMimeType: "application/json",
      },
    });

    const text2 = response.text || "{}";
    const jsonMatch2 = text2.match(/\{[\s\S]*\}/);
    const cleanJson2 = jsonMatch2 ? jsonMatch2[0] : text2.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson2);
  } catch (error) {
    console.error("Error getting AI help:", error);
    return null;
  }
};
