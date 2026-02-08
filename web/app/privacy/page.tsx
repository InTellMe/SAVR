import Navbar from '@/components/Navbar';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <h1 className="text-5xl font-bold text-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-[#9ca3c2]">
          <p className="text-sm text-[#9ca3c2]">
            Last Updated: February 7, 2025
          </p>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              1. Introduction
            </h2>
            <p>
              SAVR (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our AI-powered 
              cooking assistant service.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              2. Information We Collect
            </h2>
            
            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, password</li>
              <li><strong>Profile Information:</strong> Dietary preferences, restrictions, and cooking skill level</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store full credit card details)</li>
              <li><strong>User Content:</strong> Photos of ingredients, custom recipes, meal plans, and grocery lists</li>
              <li><strong>Communications:</strong> Messages you send to us for support or feedback</li>
            </ul>

            <h3 className="text-2xl font-semibold text-white mt-6 mb-3">
              2.2 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> Features used, recipes generated, time spent on the platform</li>
              <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed</li>
              <li><strong>Cookies:</strong> Authentication, preferences, and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              3. How We Use Your Information
            </h2>
            <p>
              We use the collected information for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Delivery:</strong> Provide recipe generation, meal planning, and inventory management</li>
              <li><strong>AI Processing:</strong> Analyze ingredient photos and generate personalized recipe recommendations</li>
              <li><strong>Account Management:</strong> Create and maintain your account, process subscriptions</li>
              <li><strong>Communication:</strong> Send service updates, respond to inquiries, and provide customer support</li>
              <li><strong>Improvement:</strong> Analyze usage patterns to improve our AI models and features</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security threats</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our Terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              4. Third-Party Services
            </h2>
            <p>
              We use the following third-party services that may collect or process your data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Firebase/Google Cloud:</strong> Authentication, database, and hosting</li>
              <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
              <li><strong>OpenAI:</strong> AI-powered recipe generation and chat features</li>
              <li><strong>Google Cloud Vision:</strong> Image analysis for ingredient identification</li>
            </ul>
            <p className="mt-4">
              These services have their own privacy policies that govern their use of your information. 
              We encourage you to review their policies.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              5. Data Sharing and Disclosure
            </h2>
            <p>
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (as listed above)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              6. Data Storage and Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit using SSL/TLS</li>
              <li>Secure storage on Google Cloud Platform</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication measures</li>
              <li>Password hashing and secure authentication through Firebase</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the internet is 100% secure. While we strive to protect 
              your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              7. Data Retention
            </h2>
            <p>
              We retain your information for as long as necessary to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide the Service to you</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Improve our AI models and services</li>
            </ul>
            <p className="mt-4">
              When you delete your account, we will delete or anonymize your personal information, except where 
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              8. Your Rights and Choices
            </h2>
            <p>
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Cookies:</strong> Manage cookie preferences through your browser settings</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at privacy@savr.cam.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p>
              SAVR is not intended for children under 13 years of age. We do not knowingly collect personal 
              information from children under 13. If you believe we have collected information from a child 
              under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              10. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your information in accordance 
              with this Privacy Policy and applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              11. California Privacy Rights
            </h2>
            <p>
              If you are a California resident, you have additional rights under the California Consumer 
              Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Know what personal information is collected, used, shared, or sold</li>
              <li>Delete personal information held by us</li>
              <li>Opt-out of the sale of personal information (we do not sell personal information)</li>
              <li>Non-discrimination for exercising your CCPA rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              12. European Privacy Rights (GDPR)
            </h2>
            <p>
              If you are in the European Economic Area (EEA), you have rights under the General Data 
              Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right to access, rectification, and erasure</li>
              <li>Right to restrict or object to processing</li>
              <li>Right to data portability</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              13. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. 
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-white mt-8 mb-4">
              14. Contact Us
            </h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our privacy practices, 
              please contact us at:
            </p>
            <p className="mt-4">
              <strong>Email:</strong> privacy@savr.cam<br />
              <strong>Support:</strong> support@savr.cam
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
