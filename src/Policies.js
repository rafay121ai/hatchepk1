import React from 'react';
import './Policies.css';

function Policies() {
  return (
    <div className="policies-page">
      <div className="policies-container">
        <div className="policies-header">
          <h1>Policies & Terms</h1>
        </div>
        
        <div className="policies-content">
          
          {/* Return Policy */}
          <section className="policy-section">
            <h2>Return Policy</h2>
            <div className="policy-subsection">
              <h3>No Returns Policy</h3>
              <p>
                At HatchePK, we operate under a strict <strong>no returns policy</strong> for all digital products and services. 
                This policy is in place to protect the integrity of our digital content and ensure fair usage for all customers.
              </p>
            </div>
            
            <div className="policy-subsection">
              <h3>Why No Returns?</h3>
              <ul>
                <li><strong>Digital Nature:</strong> Our guides and content are digital products that can be instantly downloaded and accessed</li>
                <li><strong>Intellectual Property:</strong> Once accessed, the content cannot be "returned" in the traditional sense</li>
                <li><strong>Quality Assurance:</strong> We provide detailed previews and descriptions to help you make informed decisions</li>
                <li><strong>Fair Usage:</strong> This policy ensures all customers have equal access to our content</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Before You Purchase</h3>
              <p>We encourage all customers to:</p>
              <ul>
                <li>Read the detailed product descriptions</li>
                <li>Review the preview chapters and content samples</li>
                <li>Check the compatibility with your needs</li>
                <li>Contact us with any questions before purchasing</li>
              </ul>
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="policy-section">
            <h2>Privacy Policy</h2>
            <div className="policy-subsection">
              <h3>Information We Collect</h3>
              <p>At HatchePK, we collect information to provide you with the best possible service:</p>
              <ul>
                <li><strong>Personal Information:</strong> Name, email address, phone number when you create an account or make a purchase</li>
                <li><strong>Payment Information:</strong> Billing address and payment details (processed securely through our payment partners)</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our website and content</li>
                <li><strong>Device Information:</strong> IP address, browser type, and device information for security and analytics</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>How We Use Your Information</h3>
              <p>We use your information to:</p>
              <ul>
                <li>Process your orders and provide customer support</li>
                <li>Send you important updates about your purchases</li>
                <li>Improve our website and services</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure security</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Information Sharing</h3>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul>
                <li><strong>Service Providers:</strong> With trusted partners who help us operate our business (payment processors, email services)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with notice to users)</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Data Security</h3>
              <p>We implement appropriate security measures to protect your personal information:</p>
              <ul>
                <li>SSL encryption for all data transmission</li>
                <li>Secure payment processing through trusted partners</li>
                <li>Regular security audits and updates</li>
                <li>Limited access to personal information by authorized personnel only</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Your Rights</h3>
              <p>You have the right to:</p>
              <ul>
                <li>Access and review your personal information</li>
                <li>Request corrections to inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Opt-out of marketing communications</li>
                <li>Data portability (receive your data in a portable format)</li>
              </ul>
            </div>
          </section>

          {/* Refund Policy */}
          <section className="policy-section">
            <h2>Refund Policy</h2>
            <div className="policy-subsection">
              <h3>No Refunds Policy</h3>
              <p>
                At HatchePK, we operate under a strict <strong>no refunds policy</strong> for all digital products and services. 
                This policy is designed to protect our business model and ensure fair usage of our digital content.
              </p>
            </div>
            
            <div className="policy-subsection">
              <h3>Why No Refunds?</h3>
              <ul>
                <li><strong>Instant Access:</strong> Digital products are delivered immediately upon purchase</li>
                <li><strong>Intellectual Property:</strong> Once accessed, our content cannot be "unseen" or returned</li>
                <li><strong>Quality Assurance:</strong> We provide comprehensive previews and detailed descriptions</li>
                <li><strong>Fair Business Practice:</strong> This policy ensures consistent service for all customers</li>
                <li><strong>Content Protection:</strong> Prevents abuse of our digital content system</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>What This Means</h3>
              <p>By purchasing our digital products, you acknowledge and agree that:</p>
              <ul>
                <li>All sales are final and non-refundable</li>
                <li>You have reviewed the product description and previews</li>
                <li>You understand the digital nature of the product</li>
                <li>You accept the terms of this refund policy</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Technical Issues</h3>
              <p>If you experience technical difficulties accessing your purchased content, we will work with you to resolve the issue. This may include:</p>
              <ul>
                <li>Providing alternative download links</li>
                <li>Resending access credentials</li>
                <li>Technical support and troubleshooting</li>
                <li>Account verification and assistance</li>
              </ul>
              <p><strong>Note:</strong> Technical support does not constitute a refund or return.</p>
            </div>
          </section>

          {/* Terms & Conditions */}
          <section className="policy-section">
            <h2>Terms & Conditions</h2>
            <div className="policy-subsection">
              <h3>Acceptance of Terms</h3>
              <p>
                By accessing and using HatchePK's website and services, you accept and agree to be bound by 
                the terms and provision of this agreement. If you do not agree to abide by the above, 
                please do not use this service.
              </p>
            </div>
            
            <div className="policy-subsection">
              <h3>Use License</h3>
              <p>
                Permission is granted to temporarily download one copy of HatchePK's materials for 
                personal, non-commercial transitory viewing only. This is the grant of a license, 
                not a transfer of title, and under this license you may not:
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Redistribute or resell the content without explicit permission</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>User Accounts</h3>
              <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for:</p>
              <ul>
                <li>Safeguarding the password and all activities under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring your account information remains accurate and up-to-date</li>
                <li>Maintaining the confidentiality of your account credentials</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Prohibited Uses</h3>
              <p>You may not use our service:</p>
              <ul>
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
                <li>To upload or transmit viruses or any other type of malicious code</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Payment Terms</h3>
              <p>All purchases are subject to the following terms:</p>
              <ul>
                <li><strong>Payment:</strong> All fees are due and payable in advance</li>
                <li><strong>No Refunds:</strong> All sales are final - no refunds or returns</li>
                <li><strong>Currency:</strong> All prices are in Pakistani Rupees (PKR)</li>
                <li><strong>Taxes:</strong> Prices may include applicable taxes</li>
                <li><strong>Access:</strong> Content access is granted immediately upon successful payment</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Affiliate Program</h3>
              <p>Our affiliate program is subject to additional terms:</p>
              <ul>
                <li>Affiliates must be approved before earning commissions</li>
                <li>Commission rates are determined by affiliate tier</li>
                <li>Commissions are paid according to our payout schedule</li>
                <li>Fraudulent activity will result in immediate termination</li>
                <li>Affiliates must comply with all marketing guidelines</li>
              </ul>
            </div>
            
            <div className="policy-subsection">
              <h3>Limitation of Liability</h3>
              <p>
                In no event shall HatchePK, nor its directors, employees, partners, agents, suppliers, 
                or affiliates, be liable for any indirect, incidental, special, consequential, or 
                punitive damages, including without limitation, loss of profits, data, use, goodwill, 
                or other intangible losses, resulting from your use of the service.
              </p>
            </div>
            
            <div className="policy-subsection">
              <h3>Governing Law</h3>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws 
                of Pakistan and you irrevocably submit to the exclusive jurisdiction of the courts 
                in that state or location.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="policy-section">
            <h2>Contact Information</h2>
            <p>
              If you have any questions about these policies or need assistance, please contact us:
            </p>
            <ul>
              <li>Email: info@hatche.com</li>
              <li>Instagram: <a href="https://www.instagram.com/hatchepk/" target="_blank" rel="noopener noreferrer">@hatchepk</a></li>
            </ul>
            <p>
              We're here to help ensure you have a positive experience with our content and services.
            </p>
          </section>

          {/* Policy Updates */}
          <section className="policy-section">
            <h2>Policy Updates</h2>
            <p>
              We reserve the right to update these policies at any time. Changes will be posted on this page 
              with an updated revision date. Your continued use of our services constitutes acceptance of any changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Policies;
