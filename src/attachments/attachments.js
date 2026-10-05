// Fotos anexadas às tarefas.
//
// A imagem escolhida (câmera ou galeria) é copiada para a pasta de documentos do
// app, que sobrevive às atualizações do APK. No banco só guardamos o nome do
// arquivo; o caminho completo é montado na hora de mostrar, assim não quebra se o
// Android mudar o caminho base do app.

import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as db from '../db/database';

const dir = new Directory(Paths.document, 'attachments');

function ensureDir() {
  dir.create({ intermediates: true, idempotent: true });
}

export function attachmentUri(fileName) {
  return new File(dir, fileName).uri;
}

export function deleteAttachmentFile(fileName) {
  try {
    const file = new File(dir, fileName);
    if (file.exists) file.delete();
  } catch {
    // arquivo já sumiu: nada a limpar
  }
}

// Copia o que o seletor devolveu (arquivo temporário) para a pasta permanente.
function persist(assets) {
  ensureDir();
  return assets.map((asset) => {
    const ext = /\.(png|webp|heic|jpe?g)$/i.exec(asset.fileName ?? asset.uri)?.[1]?.toLowerCase();
    const fileName = `${db.newUuid()}.${ext ?? 'jpg'}`;
    new File(asset.uri).copy(new File(dir, fileName));
    return { fileName, uri: attachmentUri(fileName) };
  });
}

// Cada função devolve { photos, denied }. `photos` vem vazio se a usuária cancelar.
export async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { photos: [], denied: true };
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
  return { photos: result.canceled ? [] : persist(result.assets), denied: false };
}

// A galeria usa o seletor de fotos do sistema, que não exige permissão no Android.
export async function pickPhotos() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });
  return { photos: result.canceled ? [] : persist(result.assets), denied: false };
}

// Grava no banco o resultado do formulário: insere as fotos novas e remove
// (banco + arquivo) as que a usuária tirou da lista.
export function saveAttachments(taskUuid, photos) {
  const keptIds = photos.filter((p) => p.id).map((p) => p.id);
  for (const old of db.getAttachments(taskUuid)) {
    if (!keptIds.includes(old.id)) {
      db.removeAttachment(old.id);
      deleteAttachmentFile(old.file_name);
    }
  }
  for (const photo of photos) {
    if (!photo.id) db.addAttachment(taskUuid, photo.fileName);
  }
}

// Ao apagar a tarefa, as fotos dela vão junto.
export function clearAttachments(taskUuid) {
  saveAttachments(taskUuid, []);
}
