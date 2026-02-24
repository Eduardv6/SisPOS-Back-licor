import cron from "node-cron";
import { runAutomaticBackupInternal } from "../controllers/backupController.js";

const initCronJobs = () => {
  // Configurar respaldo diario a las 03:00 AM
  // Formato: minute hour dayOfMonth month dayOfWeek
  cron.schedule("0 3 * * *", () => {
    console.log("[Cron] Iniciando respaldo automático de las 03:00 AM...");
    runAutomaticBackupInternal();
  });

  console.log("[Cron] Tareas programadas inicializadas");
};

export default initCronJobs;
