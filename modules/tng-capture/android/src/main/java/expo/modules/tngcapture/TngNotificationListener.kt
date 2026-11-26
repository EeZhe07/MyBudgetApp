package expo.modules.tngcapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONException
import java.io.IOException

class TngNotificationListener : NotificationListenerService() {
  private val activeTimes = mutableMapOf<String, Long>()

  override fun onListenerConnected() {
    super.onListenerConnected()
    activeNotifications?.forEach { onNotificationPosted(it) }
  }

  override fun onNotificationPosted(event: StatusBarNotification) {
    if (event.packageName != CaptureQueue.TNG_PACKAGE) return
    try {
      if (!CaptureQueue.isEnabled(this)) return
      if (event.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
      val postedAt = activeTimes.getOrPut(event.key) {
        event.notification.`when`.takeIf { it > 0 } ?: event.postTime
      }
      val extras = event.notification.extras
      CaptureQueue.ingest(
        this, event.packageName, "${event.key}:$postedAt", postedAt,
        extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty(),
        (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
          ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
      )
    } catch (_: IOException) {
      // Keep notification contents out of device logs even if storage is unavailable.
    } catch (_: JSONException) {
      // Settings surfaces a read error if the queue cannot be decoded.
    }
  }

  override fun onNotificationRemoved(event: StatusBarNotification) {
    activeTimes.remove(event.key)
  }
}
