import Navbar from '@/components/Navbar';

export default function TermsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <h1 className="text-5xl font-bold text-white mb-8">
          Terms and Conditions
        </h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-[#9ca3c2]">
          <p className="text-sm text-[#9ca3c2]">
            Last Updated: February 7, 2025
          </p>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing and using SAVR (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              2. Description of Service
            </h2>
            <p>
              SAVR is an AI-powered cooking assistant that helps users generate recipes based on available ingredients, 
              create meal plans, manage inventory, and provides pet-safe recipe recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              3. User Accounts
            </h2>
            <p>
              To access certain features of the Service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              4. Subscription and Payment
            </h2>
            <p>
              SAVR offers free and paid subscription tiers:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Basic: Free tier with limited features</li>
              <li>Plus: Paid subscription with expanded features</li>
              <li>Premium: Paid subscription with all features</li>
            </ul>
            <p className="mt-4">
              Paid subscriptions are billed on a recurring monthly basis. You may cancel your subscription at any time. 
              Refunds are subject to our 30-day money-back guarantee policy for new subscriptions.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              5. Pet Recipe Disclaimer
            </h2>
            <p className="font-semibold text-orange-600">
              IMPORTANT: Pet recipes provided by SAVR are for informational purposes only and are not a substitute 
              for professional veterinary advice.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Always consult with a licensed veterinarian before introducing new foods to your pet&apos;s diet</li>
              <li>SAVR excludes known toxic ingredients, but individual pets may have allergies or sensitivities</li>
              <li>We are not responsible for any adverse reactions or health issues that may result from following pet recipes</li>
              <li>Monitor your pet closely when introducing new foods</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              6. AI-Generated Content
            </h2>
            <p>
              Recipes and recommendations are generated using artificial intelligence. While we strive for accuracy:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI-generated recipes may contain errors or inaccuracies</li>
              <li>Users should apply common sense and culinary knowledge when following recipes</li>
              <li>SAVR is not responsible for the outcome of recipes or any resulting food safety issues</li>
              <li>Always follow proper food safety guidelines when preparing and storing food</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              7. User Content
            </h2>
            <p>
              When you upload photos or provide information to SAVR:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You retain ownership of your content</li>
              <li>You grant SAVR a license to use your content to provide and improve the Service</li>
              <li>You are responsible for ensuring you have the right to upload any content</li>
              <li>You must not upload content that infringes on others&apos; rights or is illegal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              8. Prohibited Uses
            </h2>
            <p>
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Upload malicious code or viruses</li>
              <li>Harvest or collect user information without permission</li>
              <li>Use automated systems (bots, scrapers) without authorization</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              9. Intellectual Property
            </h2>
            <p>
              The Service, including its design, features, and original content (excluding user content), 
              is owned by SAVR and protected by intellectual property laws. You may not copy, modify, 
              distribute, or create derivative works without our permission.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, SAVR shall not be liable for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Any indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Food safety issues or adverse health reactions from recipes</li>
              <li>Pet health issues resulting from pet recipes</li>
              <li>Any damages arising from service interruptions or errors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              11. Disclaimers
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED. SAVR DISCLAIMS ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A 
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              12. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. Changes will be effective immediately 
              upon posting. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              13. Termination
            </h2>
            <p>
              We may suspend or terminate your account at any time for violation of these Terms or for any 
              other reason at our discretion. You may terminate your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              14. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which SAVR operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              15. Contact Information
            </h2>
            <p>
              For questions about these Terms and Conditions, please contact us at:
            </p>
            <p className="mt-2">
              Email: support@savr.cam
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 SAVR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
