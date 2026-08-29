using System;
using System.Threading.Tasks;
using Windows.Services.Store;

namespace StoreLicenseChecker
{
    class Program
    {
        static async Task Main(string[] args)
        {
            try
            {
                var context = StoreContext.GetDefault();
                var license = await context.GetAppLicenseAsync();
                
                // EXPLICIT PLACEHOLDERS: These must be replaced with the exact Product IDs
                // from the Microsoft Partner Center AFTER you create the subscription add-ons.
                string yearlyStoreId = "9N05JTP77K0F";
                
                bool isActive = false;

                // Check if the user has an active entitlement for the yearly subscription
                var addons = license.AddOnLicenses;
                if (addons.ContainsKey(yearlyStoreId) && addons[yearlyStoreId].IsActive)
                {
                    isActive = true;
                }
                
                // Note: If you eventually decide the base app itself is a one-time paid purchase
                // instead of a subscription, you would check `license.IsActive` instead.
                
                // Return exactly the JSON format the Node.js process expects
                Console.WriteLine($"{{\"isStoreBuild\": true, \"isActive\": {(isActive ? "true" : "false")}}}");
            }
            catch (Exception ex)
            {
                // Escape quotes in the exception message for valid JSON
                string safeError = ex.Message.Replace("\"", "\\\"");
                Console.WriteLine($"{{\"isStoreBuild\": true, \"isActive\": false, \"error\": \"{safeError}\"}}");
            }
        }
    }
}
