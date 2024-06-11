import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import SpeedTestChart from './SpeedTestChart';
import DatePicker from 'react-datepicker';
import { FiCalendar } from 'react-icons/fi';
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
      <header className="app-header">
        <img src="/logo100.png" className="app-logo" alt="logo" />
        <h1>Internet Speed Test Results</h1>
      </header>
      <div className="date-picker-container">
        <label>
          Start Date
          <div className="date-picker">
            <div className="date-picker-input">
              <DatePicker selected={startDate} onChange={date => setStartDate(date)} />
              <FiCalendar className="calendar-icon" />
            </div>
          </div>
        </label>
        <label>
          End Date
          <div className="date-picker">
            <div className="date-picker-input">
              <DatePicker selected={endDate} onChange={date => setEndDate(date)} />
              <FiCalendar className="calendar-icon" />
            </div>
          </div>
        </label>
        <button onClick={() => runSpeedTest()}>Queue Speed Test</button>
      </div>
      <SpeedTestChart data={data.getSpeedTestResults} />
    </div>
  );
}

export default App;

