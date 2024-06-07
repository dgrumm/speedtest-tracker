import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import SpeedTestChart from './SpeedTestChart';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

const GET_SPEEDTEST_RESULTS = gql`
  query GetSpeedTestResults($startDate: String!, $endDate: String!) {
    getSpeedTestResults(startDate: $startDate, endDate: $endDate) {
      timestamp
      download
      upload
      ping
    }
  }
`;

const RUN_SPEEDTEST = gql`
  mutation RunSpeedTest {
    runSpeedTest {
      timestamp
      download
      upload
      ping
    }
  }
`;

function App() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const { loading, error, data } = useQuery(GET_SPEEDTEST_RESULTS, {
    variables: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
  });
  const [runSpeedTest] = useMutation(RUN_SPEEDTEST);

  // Set default date span to the last week
  useEffect(() => {
    const endDate = new Date();
    setEndDate(endDate);
    
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    setStartDate(startDate);
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="app-container">
      <h1>Internet Speed Test Results</h1>
      <div>
        <DatePicker selected={startDate} onChange={date => setStartDate(date)} /> - 
        <DatePicker selected={endDate} onChange={date => setEndDate(date)} />
      </div>
      <SpeedTestChart data={data.getSpeedTestResults} />
      <button onClick={() => runSpeedTest()}>Run Speed Test</button>
    </div>
  );
}

export default App;

