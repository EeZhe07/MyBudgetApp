import expo.modules.tngcapture.CapturedPayment;
import expo.modules.tngcapture.TngAlertParser;

class TngParserCheck {
    public static void main(String[] args) {
        CapturedPayment transfer = parse("DuitNow Transfer is successful!",
                "You have successfully transferred RM 1.00 to TEST RECIPIENT.", false);
        check(transfer != null && transfer.getAmountSen() == 100, "Real transfer amount");
        check("transfer".equals(transfer.getType()), "Real transfer type");
        check("TEST RECIPIENT".equals(transfer.getMerchant()), "Recipient");
        check(parse("DuitNow Transfer is successful!",
                "You have successfully transferred RM 1,234.56 to TEST RECIPIENT.", false).getAmountSen() == 123456,
                "Grouped amount in sen");
        check(parse("DuitNow Transfer is successful!",
                "You have successfully transferred RM 1.00 to \u6d4b\u8bd5\u7528\u6237.", false) != null, "Unicode recipient");
        String[] rejected = {
                "You have successfully transferred RM 0.00 to TEST RECIPIENT.",
                "You have successfully transferred RM 1.0 to TEST RECIPIENT.",
                "You have successfully transferred RM 12,34.56 to TEST RECIPIENT.",
                "You have received RM 1.00 from TEST RECIPIENT.",
                "Please approve your RM 1.00 transfer.",
                "Transfer RM 1.00 and earn rewards!"
        };
        for (String body : rejected) {
            check(parse("DuitNow Transfer is successful!", body, false) == null, "Reject ambiguous wording");
        }
        check(parse("Transfer failed", "You have successfully transferred RM 1.00 to TEST RECIPIENT.", false) == null,
                "Reject failed title");
        check(parse("Test purchase complete", "Paid RM8.00 to Demo Cafe", false) == null, "Keep fixtures synthetic");
        check(parse("Test purchase complete", "Paid RM8.00 to Demo Cafe", true).getAmountSen() == 800,
                "Preserve synthetic purchase");
        System.out.println("TNG parser checks passed");
    }

    private static CapturedPayment parse(String title, String body, boolean synthetic) {
        return TngAlertParser.INSTANCE.parse(title, body, synthetic);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
