const admin = require("firebase-admin");
const db = admin.database();

console.log("ESP32 - Sincronia ativada");

db.ref("Esp32").on("child_added", (aptoSnap) => {
  const apto = aptoSnap.key; // apto101

  aptoSnap.ref.on("child_added", (registroSnap) => {
    const pushId = registroSnap.key;
    const dados = registroSnap.val();

    const numero = apto.replace("apto", ""); // 101

    const destino = `Consumos/Apartamentos/apartamento${numero}/Consumos/${pushId}`;

    db.ref(destino).set(dados);
  });
});
