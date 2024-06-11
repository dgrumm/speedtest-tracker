import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import App, { GET_SPEEDTEST_RESULTS } from './App';

const mocks = [
  {
    request: {
      query: GET_SPEEDTEST_RESULTS,
      variables: {
        startDate: '2022-01-01',
        endDate: '2022-12-31',
      },
    },
    result: {
      data: {
        getSpeedTestResults: [
          {
            timestamp: '2022-01-01T00:00:00Z',
            download: 100,
            upload: 50,
            ping: 10,
          },
          // Add more mock data as needed
        ],
      },
    },
  },
];

test('renders without crashing', () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <App />
    </MockedProvider>
  ).catch(e => console.error(e));
});