// Backup local: exporta um .json com tudo (compartilhável por WhatsApp/Drive)
// e importa de volta substituindo os dados atuais.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as db from '../db/database';

export async function exportBackup() {
  const json = JSON.stringify(db.exportAll(), null, 2);
  const name = `madutasks-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup do MaduTasks',
  });
}

// Retorna true se importou; false se a usuária cancelou a escolha do arquivo.
export async function importBackup() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return false;
  const file = new File(result.assets[0].uri);
  const backup = JSON.parse(await file.text());
  db.importAll(backup);
  return true;
}
