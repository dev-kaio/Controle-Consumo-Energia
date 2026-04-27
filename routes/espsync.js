const admin = require("firebase-admin");
const db = admin.database();

console.log("ESP32 - Sincronia ativada");

db.ref("Esp32").on("child_added", (aptoSnap) => {
  const aptoRaw = aptoSnap.key; // ex: apto101

  // converte pro novo padrão do banco
  const numero = aptoRaw.replace("apto", ""); // 101
  const aptoID = `apto_${numero}`;

  aptoSnap.ref.on("child_added", async (registroSnap) => {
    const pushId = registroSnap.key;
    const dados = registroSnap.val();

    try {
      // novo destino
      const destino = `leituras/${aptoID}/consumo/${pushId}`;

      await db.ref(destino).set(dados);

      console.log(`Salvo em ${destino}`);
    } catch (err) {
      console.error("Erro ao salvar leitura:", err);
    }
  });
});