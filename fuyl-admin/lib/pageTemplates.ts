export const PAGE_TEMPLATES = [
  { id: 'blank', name: 'Blank page', body: '' },
  { id: 'standard', name: 'Standard information page', body: '<p>Add a short introduction to this page.</p><h2>Section heading</h2><p>Add the main information here.</p><h2>Need help?</h2><p>Contact our support team for assistance.</p>' },
  { id: 'policy', name: 'Policy page', body: '<p><em>Last updated: add date</em></p><h2>Overview</h2><p>Explain the purpose and scope of this policy.</p><h2>Terms</h2><ul><li>Add the first term.</li><li>Add another term.</li></ul><h2>Contact us</h2><p>Explain how customers can contact FUYL with questions.</p>' },
  { id: 'landing', name: 'Campaign landing page', body: '<p>Introduce the campaign and its main customer benefit.</p><h2>Why it matters</h2><p>Explain the value clearly.</p><h2>What you receive</h2><ul><li>Benefit one</li><li>Benefit two</li><li>Benefit three</li></ul><p><a href="/collections/all"><strong>Shop now</strong></a></p>' },
  { id: 'faq', name: 'FAQ page', body: '<p>Answers to common customer questions.</p><h2>Question one</h2><p>Add the answer.</p><h2>Question two</h2><p>Add the answer.</p><h2>Still need help?</h2><p>Contact our support team.</p>' },
] as const
