// Config plugin do Expo: instala o widget de tarefas no projeto Android durante o
// `expo prebuild`. Copia o provider em Java e os recursos (layout, cores claro/escuro)
// e registra o receiver no AndroidManifest. O widget não depende de React Native.

const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const NATIVE_DIR = path.join(__dirname, 'native');
const RECEIVER = 'TaskWidgetProvider';

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

const withWidgetFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      const packageName = cfg.android?.package;
      if (!packageName) throw new Error('task-widget: defina android.package no app.json');
      const mainDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main');

      copyDir(path.join(NATIVE_DIR, 'res'), path.join(mainDir, 'res'));

      const javaDir = path.join(mainDir, 'java', ...packageName.split('.'));
      fs.mkdirSync(javaDir, { recursive: true });
      const source = fs.readFileSync(path.join(NATIVE_DIR, `${RECEIVER}.java`), 'utf8');
      fs.writeFileSync(
        path.join(javaDir, `${RECEIVER}.java`),
        source.replace(/__PACKAGE__/g, packageName)
      );
      return cfg;
    },
  ]);

const withWidgetManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const packageName = cfg.android.package;
    const app = cfg.modResults.manifest.application[0];
    const name = `${packageName}.${RECEIVER}`;
    app.receiver = (app.receiver ?? []).filter((r) => r.$['android:name'] !== name);
    app.receiver.push({
      $: { 'android:name': name, 'android:exported': 'true', 'android:label': 'MaduTasks' },
      'intent-filter': [
        { action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/madu_task_widget_info',
          },
        },
      ],
    });
    return cfg;
  });

module.exports = (config) => withWidgetManifest(withWidgetFiles(config));
