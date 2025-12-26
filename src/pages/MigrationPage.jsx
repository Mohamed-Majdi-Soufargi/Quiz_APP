import { useState } from 'react';
import { Brain, Database, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { migrateDatabase, testMigration } from '../services/migration';

const MigrationPage = () => {
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const handleMigrate = async () => {
    setStatus('running');
    setLogs([]);
    setError('');
    
    addLog('Starting database migration...', 'info');
    
    // Override console.log to capture migration logs
    const originalLog = console.log;
    console.log = (message) => {
      originalLog(message);
      addLog(message.toString(), 'info');
    };

    try {
      const result = await migrateDatabase();
      
      if (result.success) {
        setStatus('success');
        addLog('✅ Migration completed successfully!', 'success');
      } else {
        setStatus('error');
        setError(result.error);
        addLog(`❌ Migration failed: ${result.error}`, 'error');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
      addLog(`❌ Migration error: ${err.message}`, 'error');
    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  };

  const handleTest = async () => {
    addLog('Running migration test...', 'info');
    
    const originalLog = console.log;
    console.log = (message) => {
      originalLog(message);
      addLog(message.toString(), 'info');
    };

    try {
      await testMigration();
      addLog('✅ Test completed - check browser console for details', 'success');
    } catch (err) {
      addLog(`❌ Test error: ${err.message}`, 'error');
    } finally {
      console.log = originalLog;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl mb-4 shadow-2xl">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Database Migration Tool</h1>
          <p className="text-gray-400">Run this once to update your Firebase schema</p>
        </div>

        {/* Warning Card */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-yellow-400 mb-2">⚠️ Important</h3>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• This will update your existing Firebase data structure</li>
                <li>• Run this ONLY ONCE after setting up your project</li>
                <li>• Make sure you have a backup of your data</li>
                <li>• Test first before running the full migration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <Play className="w-6 h-6 text-purple-400" />
            <span>Actions</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTest}
              disabled={status === 'running'}
              className="p-6 bg-blue-500/20 border border-blue-500/50 rounded-xl hover:bg-blue-500/30 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3 mb-2">
                <Database className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Test Migration</h3>
              </div>
              <p className="text-sm text-gray-400">
                Preview what will be changed without modifying data
              </p>
            </button>

            <button
              onClick={handleMigrate}
              disabled={status === 'running'}
              className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3 mb-2">
                <Play className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold text-white">Run Migration</h3>
              </div>
              <p className="text-sm text-white/80">
                Update your database with new schema
              </p>
            </button>
          </div>
        </div>

        {/* Status Display */}
        {status !== 'idle' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              {status === 'running' && (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <h3 className="text-xl font-bold text-white">Running Migration...</h3>
                </>
              )}
              {status === 'success' && (
                <>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-bold text-green-400">Migration Successful!</h3>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <h3 className="text-xl font-bold text-red-400">Migration Failed</h3>
                </>
              )}
            </div>

            {/* Logs */}
            <div className="bg-slate-900/50 rounded-xl p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-2 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-gray-300'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                <p className="font-semibold mb-1">Error Details:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                <h4 className="text-green-400 font-bold mb-2">✅ Next Steps:</h4>
                <ul className="text-green-200 text-sm space-y-1">
                  <li>1. Check your Firebase Console to verify changes</li>
                  <li>2. Test your application features</li>
                  <li>3. You can safely delete this migration page</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8">
          <h2 className="text-xl font-bold text-white mb-4">What This Migration Does:</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">For Students:</p>
                <p className="text-sm text-gray-400">Adds stats (points, streak, completed assignments) and badges array</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">For Teachers:</p>
                <p className="text-sm text-gray-400">Adds teacher statistics (total quizzes, students, average scores)</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">For Assignments:</p>
                <p className="text-sm text-gray-400">Adds category, difficulty, time limit, passing score, and question types</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">New Collections:</p>
                <p className="text-sm text-gray-400">Creates submissions, notifications, leaderboard, and live sessions collections</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPage;