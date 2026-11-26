package expo.modules.tngcapture

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class TngCaptureModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("TngCapture")

    AsyncFunction("status") {
      val context = context
      val component = ComponentName(context, TngNotificationListener::class.java)
      val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        context.getSystemService(NotificationManager::class.java)
          .isNotificationListenerAccessGranted(component)
      } else {
        Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
          ?.split(':')?.any { ComponentName.unflattenFromString(it) == component } == true
      }
      mapOf(
        "enabled" to CaptureQueue.isEnabled(context),
        "granted" to granted,
        "canReplay" to canReplay(context),
        "lastUnrecognisedAt" to CaptureQueue.lastUnrecognisedAt(context)
      )
    }
    AsyncFunction("setEnabled") { enabled: Boolean ->
      CaptureQueue.setEnabled(context, enabled)
    }
    AsyncFunction("openSettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("readQueue") {
      CaptureQueue.read(context)
    }
    AsyncFunction("acknowledge") { ids: List<String> ->
      CaptureQueue.acknowledge(context, ids)
    }
    AsyncFunction("replaySamples") {
      val context = context
      check(canReplay(context))
      val batch = UUID.randomUUID().toString()
      val now = System.currentTimeMillis()
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-1", now,
        "Test purchase complete", "Paid RM8.00 to Demo Cafe", synthetic = true)
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-1", now,
        "Test purchase complete", "Paid RM8.00 to Demo Cafe", synthetic = true)
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-2", now,
        "Test purchase complete", "Paid RM8.00 to Demo Cafe", synthetic = true)
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-3", now,
        "Reload complete", "Reloaded RM50.00", synthetic = true)
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-4", now,
        "Approval pending", "Approve RM8.00 payment", synthetic = true)
      CaptureQueue.ingest(context, "example.unrelated", "$batch-5", now,
        "Test purchase complete", "Paid RM8.00 to Demo Cafe", synthetic = true)
      CaptureQueue.ingest(context, CaptureQueue.TNG_PACKAGE, "$batch-6", now - 1000,
        "Test purchase complete", "Paid RM12.40 to Demo Bookshop", synthetic = true)
    }
  }

  private fun canReplay(context: Context) =
    context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
}
