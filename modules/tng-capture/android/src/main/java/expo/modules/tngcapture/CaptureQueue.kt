package expo.modules.tngcapture

import android.content.Context
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.security.MessageDigest

internal object CaptureQueue {
  // Android's notification dispatcher supplies this package name.
  const val TNG_PACKAGE = "my.com.tngdigital.ewallet"


  @Synchronized
  fun isEnabled(context: Context) = readFile(context).optBoolean("enabled")

  @Synchronized
  fun setEnabled(context: Context, enabled: Boolean) {
    val state = readFile(context).put("enabled", enabled)
    if (!enabled) state.remove("lastUnrecognisedAt")
    writeFile(context, state)
  }

  @Synchronized
  fun lastUnrecognisedAt(context: Context) = readFile(context).optLong("lastUnrecognisedAt")

  @Synchronized
  fun ingest(
    context: Context, source: String, eventKey: String, time: Long, title: String,
    body: String, synthetic: Boolean = false
  ) {
    if (source != TNG_PACKAGE) return
    val state = readFile(context)
    if (!synthetic && !state.optBoolean("enabled")) return

    val payment = TngAlertParser.parse(title, body, synthetic)
    if (payment == null) {
      if (!synthetic) writeFile(context, state.put("lastUnrecognisedAt", System.currentTimeMillis()))
      return
    }

    val id = MessageDigest.getInstance("SHA-256").digest(eventKey.toByteArray())
      .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    val drafts = state.optJSONObject("drafts") ?: JSONObject()
    if (drafts.has(id)) return
    drafts.put(id, JSONObject()
      .put("id", id)
      .put("amountSen", payment.amountSen)
      .put("merchant", payment.merchant ?: JSONObject.NULL)
      .put("type", payment.type)
      .put("postedAt", time))
    writeFile(context, state.put("drafts", drafts))
  }

  @Synchronized
  fun read(context: Context) = (readFile(context).optJSONObject("drafts") ?: JSONObject()).toString()

  @Synchronized
  fun acknowledge(context: Context, ids: List<String>) {
    val state = readFile(context)
    val drafts = state.optJSONObject("drafts") ?: return
    ids.forEach { drafts.remove(it) }
    writeFile(context, state)
  }

  private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir, "tng-capture.json"))

  private fun readFile(context: Context): JSONObject = try {
    JSONObject(String(file(context).readFully(), Charsets.UTF_8))
  } catch (_: FileNotFoundException) {
    JSONObject()
  }

  private fun writeFile(context: Context, state: JSONObject) {
    val file = file(context)
    val stream = file.startWrite()
    try {
      stream.write(state.toString().toByteArray(Charsets.UTF_8))
      file.finishWrite(stream)
    } catch (error: Exception) {
      file.failWrite(stream)
      throw error
    }
  }
}
