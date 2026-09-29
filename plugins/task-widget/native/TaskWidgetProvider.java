package __PACKAGE__;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Widget da tela inicial com as próximas tarefas.
 *
 * Não depende de React Native nem do Expo: o app grava um resumo em
 * <filesDir>/widget.json (ver src/widget/widget.js) e o widget só lê esse arquivo.
 * Se o arquivo não existir ou estiver ilegível, mostra uma mensagem em vez de quebrar.
 */
public class TaskWidgetProvider extends AppWidgetProvider {
  static final String ACTION_REFRESH = "__PACKAGE__.WIDGET_REFRESH";
  private static final String SNAPSHOT_FILE = "widget.json";
  private static final long REFRESH_INTERVAL_MS = 15 * 60 * 1000L;
  private static final int COLOR_OVERDUE = 0xFFE53935;

  private static final int[] ROWS = {
    R.id.madu_row1, R.id.madu_row2, R.id.madu_row3, R.id.madu_row4,
  };
  private static final int[] TITLES = {
    R.id.madu_title1, R.id.madu_title2, R.id.madu_title3, R.id.madu_title4,
  };
  private static final int[] SUBS = {
    R.id.madu_sub1, R.id.madu_sub2, R.id.madu_sub3, R.id.madu_sub4,
  };

  @Override
  public void onReceive(Context context, Intent intent) {
    super.onReceive(context, intent);
    if (intent != null && ACTION_REFRESH.equals(intent.getAction())) {
      AppWidgetManager manager = AppWidgetManager.getInstance(context);
      int[] ids = manager.getAppWidgetIds(new ComponentName(context, TaskWidgetProvider.class));
      onUpdate(context, manager, ids);
    }
  }

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
    for (int id : appWidgetIds) {
      manager.updateAppWidget(id, buildViews(context));
    }
    scheduleRefresh(context);
  }

  @Override
  public void onEnabled(Context context) {
    scheduleRefresh(context);
  }

  @Override
  public void onDisabled(Context context) {
    AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarms != null) alarms.cancel(refreshIntent(context));
  }

  private static PendingIntent refreshIntent(Context context) {
    Intent intent = new Intent(context, TaskWidgetProvider.class).setAction(ACTION_REFRESH);
    return PendingIntent.getBroadcast(
        context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  // Alarme inexato (não exige permissão): o Android agrupa com outros para poupar bateria.
  private static void scheduleRefresh(Context context) {
    AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (alarms == null) return;
    alarms.setInexactRepeating(
        AlarmManager.ELAPSED_REALTIME,
        SystemClock.elapsedRealtime() + REFRESH_INTERVAL_MS,
        REFRESH_INTERVAL_MS,
        refreshIntent(context));
  }

  private static RemoteViews buildViews(Context context) {
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.madu_widget_tasks);

    Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launch != null) {
      views.setOnClickPendingIntent(
          R.id.madu_widget_root,
          PendingIntent.getActivity(
              context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
    views.setOnClickPendingIntent(R.id.madu_refresh, refreshIntent(context));

    JSONObject snapshot = readSnapshot(context);
    JSONArray tasks = snapshot == null ? null : snapshot.optJSONArray("tasks");
    int shown = tasks == null ? 0 : Math.min(tasks.length(), ROWS.length);

    if (snapshot == null) {
      views.setTextViewText(R.id.madu_summary, "Abra o app para começar");
    } else if (shown == 0) {
      views.setTextViewText(R.id.madu_summary, "Tudo em dia! 🎉");
    } else {
      int pending = snapshot.optInt("pending", shown);
      int overdue = snapshot.optInt("overdue", 0);
      String summary = pending + (pending == 1 ? " pendente" : " pendentes");
      if (overdue > 0) summary += " · " + overdue + (overdue == 1 ? " atrasada" : " atrasadas");
      views.setTextViewText(R.id.madu_summary, summary);
    }

    SimpleDateFormat isoParser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    isoParser.setTimeZone(TimeZone.getTimeZone("UTC"));
    SimpleDateFormat display = new SimpleDateFormat("EEE dd/MM HH:mm", new Locale("pt", "BR"));
    long now = System.currentTimeMillis();

    for (int i = 0; i < ROWS.length; i++) {
      if (i >= shown) {
        views.setViewVisibility(ROWS[i], View.GONE);
        continue;
      }
      JSONObject task = tasks.optJSONObject(i);
      if (task == null) {
        views.setViewVisibility(ROWS[i], View.GONE);
        continue;
      }
      views.setViewVisibility(ROWS[i], View.VISIBLE);
      views.setTextViewText(
          TITLES[i], task.optString("emoji", "📝") + " " + task.optString("title", ""));

      String sub = "";
      boolean late = false;
      try {
        Date due = isoParser.parse(task.optString("due", ""));
        if (due != null) {
          late = due.getTime() < now;
          sub = (late ? "atrasada · " : "") + display.format(due);
        }
      } catch (Exception ignored) {
        // data ilegível: mostra só o título
      }
      String subject = task.optString("subject", "");
      if (!subject.isEmpty()) sub = sub.isEmpty() ? subject : sub + " · " + subject;
      views.setTextViewText(SUBS[i], sub);
      views.setTextColor(
          SUBS[i], late ? COLOR_OVERDUE : context.getColor(R.color.madu_widget_muted));
    }
    return views;
  }

  private static JSONObject readSnapshot(Context context) {
    File file = new File(context.getFilesDir(), SNAPSHOT_FILE);
    if (!file.exists()) return null;
    try (InputStream in = new FileInputStream(file)) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] buffer = new byte[4096];
      int read;
      while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
      return new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
    } catch (Exception e) {
      return null;
    }
  }
}
