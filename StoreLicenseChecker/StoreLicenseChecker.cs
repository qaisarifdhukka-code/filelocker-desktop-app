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
                
                // Return exactly the JSON format the Node.js process expects
                Console.WriteLine($"{{\"isStoreBuild\": true, \"isActive\": {(license.IsActive ? "true" : "false")}}}");
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
