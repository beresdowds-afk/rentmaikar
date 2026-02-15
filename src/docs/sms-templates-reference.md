# Rentmaikar SMS Templates - Reference

```javascript
const smsTemplates = {
  postCall: (user) => `
    Thank you for calling Rentmaikar. 
    Your case #: ${user.caseId}
    We'll follow up within 24 hours.
    Reply HELP for assistance.
  `,
  
  documentUpload: (user) => `
    Upload your documents here:
    ${user.uploadLink}
    Valid for 24 hours.
  `,
  
  paymentReminder: (user) => `
    Payment of ${user.amount} due ${user.dueDate}.
    Pay via: ${user.paymentLink}
    Contact support: +1-202-555-0123
  `,
  
  emergencyFollowUp: (user) => `
    EMERGENCY RESPONSE:
    Help dispatched to your location.
    ETA: ${user.eta}
    Stay safe - Team will call shortly.
  `
};
```
