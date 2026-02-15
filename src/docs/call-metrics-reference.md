# Rentmaikar Call Metrics - Reference Data

```javascript
// Real-time call monitoring
const callMetrics = {
  totalCalls: 1250,
  averageWaitTime: 45, // seconds
  abandonmentRate: 0.12,
  callOutcomes: {
    resolved: 850,
    transferred: 250,
    abandoned: 150
  },
  byRegion: {
    usa: {
      calls: 750,
      avgDuration: 320, // seconds
      topIssues: ['Payment', 'Extension', 'Document']
    },
    nigeria: {
      calls: 500,
      avgDuration: 380,
      topIssues: ['Police Report', 'Payment', 'Registration']
    }
  },
  peakHours: {
    usa: ['9am-11am EST', '2pm-4pm EST'],
    nigeria: ['10am-12pm WAT', '3pm-5pm WAT']
  }
};
```
