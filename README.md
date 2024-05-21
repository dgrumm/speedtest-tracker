Sure, here is the full README markdown file with the ISC license included:

```markdown
# Speedtest Tracker

Speedtest Tracker is a comprehensive application that measures and tracks internet speed over time. The project includes a Node.js backend, a React.js web frontend, a React Native iOS application, and uses InfluxDB for data storage.

## Project Structure

This monorepo contains the following components:

- **api**: Node.js backend application using GraphQL to interact with InfluxDB.
- **web**: React.js web application (to be developed).
- **mobile**: React Native iOS application (to be developed).
- **database**: InfluxDB configurations and scripts.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js
- npm
- Docker
- Git

### Setting Up the Project

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:your_username/speedtest-tracker.git
   cd speedtest-tracker
   ```

2. **Set Up Environment Variables**:
   Create a `.env` file in the root directory with the following content:
   ```
   INFLUXDB_URL=http://localhost:8086
   INFLUXDB_TOKEN=your-token-here
   ```

3. **Start Docker Services**:
   ```bash
   docker-compose up -d
   ```

4. **Install Dependencies for API**:
   ```bash
   cd api
   npm install
   ```

5. **Run the API**:
   ```bash
   npm start
   ```

## Directory Structure

```
speedtest-tracker/
├── api/                      # Node.js application
│   ├── src/                  # Source files for the Node.js application
│   ├── test/                 # Test files for the Node.js application
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
├── web/                      # React.js web application
│   ├── src/                  # Source files for the React.js application
│   ├── public/               # Public assets for the React.js application
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
├── mobile/                   # React Native iOS application
│   ├── src/                  # Source files for the React Native application
│   ├── ios/                  # iOS-specific files
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
├── database/                 # Database configurations
│   ├── influxdb/             # InfluxDB configurations and scripts
│   └── README.md
├── docker-compose.yml        # Docker Compose file for setting up InfluxDB and other services
├── .gitignore                # Git ignore file
└── README.md                 # Root README file for the project
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/your-feature-name`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Open a pull request.

## License

```
ISC License

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Contact

TBD
```
