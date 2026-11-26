package expo.modules.tngcapture

internal data class CapturedPayment(val amountSen: Long, val merchant: String?, val type: String)

internal object TngAlertParser {
  private val samplePurchase = Regex("""Paid RM([0-9]{1,7}\.[0-9]{2})(?: to ([A-Za-z ]{1,80}))?""")
  private val bankTransfer = Regex(
    """You have successfully transferred RM\s+((?:[0-9]{1,7}|[0-9]{1,3}(?:,[0-9]{3}){1,2})\.[0-9]{2}) to ([\p{L}\p{M} .’'&()-]{1,120})\."""
  )

  fun parse(title: String, body: String, synthetic: Boolean = false): CapturedPayment? {
    val type: String
    val match = when {
      synthetic && title == "Test purchase complete" -> {
        type = "expense"
        samplePurchase.matchEntire(body)
      }
      title == "DuitNow Transfer is successful!" -> {
        type = "transfer"
        bankTransfer.matchEntire(body)
      }
      else -> return null
    } ?: return null
    val amountSen = match.groupValues[1].replace(",", "").replace(".", "").toLongOrNull() ?: return null
    if (amountSen <= 0 || amountSen > 999999999) return null
    return CapturedPayment(amountSen, match.groups[2]?.value?.trim(), type)
  }
}
