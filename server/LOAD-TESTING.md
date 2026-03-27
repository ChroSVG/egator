# Load Testing Guide

Panduan untuk melakukan load testing pada Egator API.

## 📋 Prerequisites

1. Server harus berjalan di `http://localhost:5000`
2. Node.js terinstall
3. Database MongoDB aktif

## 🚀 Jenis Test

### 1. Load Test (Normal)

Menguji performa dengan beban normal.

```bash
node load-test.js
```

**Konfigurasi Default:**
- 50 user simultan
- 10 request per user
- Total: 500 request
- Delay antar request: 100ms

### 2. Stress Test (Agresif)

Menguji batas maksimal server.

```bash
node stress-test.js
```

**Konfigurasi Default:**
- Durasi: 30 detik
- Max concurrent: 100 request
- Ramp-up time: 5 detik

## 📊 Metrik yang Diukur

### Load Test
- Total requests
- Success rate
- Response time (min, max, avg, percentiles)
- Requests per second (RPS)
- Error breakdown

### Stress Test
- Semua metrik Load Test +
- Peak concurrent requests
- Performance grading (✅ ⚠️ ❌)

## 🎯 Performance Targets

| Metrik | Target | Warning | Critical |
|--------|--------|---------|----------|
| Success Rate | ≥99% | 95-99% | <95% |
| Avg Response | <100ms | 100-500ms | >500ms |
| P95 Response | <500ms | 500-1000ms | >1000ms |
| P99 Response | <1000ms | 1000-2000ms | >2000ms |

## 🔧 Kustomisasi

### Load Test

Edit `load-test.js`:

```javascript
const CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    concurrentUsers: 50,        // Ubah jumlah user
    requestsPerUser: 10,        // Ubah request per user
    thinkTime: 100,             // Ubah delay (ms)
    timeout: 30000              // Ubah timeout (ms)
};
```

### Stress Test

Edit `stress-test.js`:

```javascript
const CONFIG = {
    baseUrl: 'http://localhost:5000/api',
    duration: 30000,          // Ubah durasi (ms)
    rampUpTime: 5000,         // Ubah ramp-up (ms)
    maxConcurrent: 100,       // Ubah max concurrent
    endpoint: '/elections'    // Ubah endpoint
};
```

## 📝 Contoh Skenario

### Skenario 1: Testing Ringan
```javascript
// load-test.js
concurrentUsers: 10,
requestsPerUser: 5,
thinkTime: 200
```

### Skenario 2: Testing Sedang
```javascript
// load-test.js
concurrentUsers: 50,
requestsPerUser: 20,
thinkTime: 100
```

### Skenario 3: Testing Berat
```javascript
// stress-test.js
duration: 60000,
maxConcurrent: 200,
rampUpTime: 10000
```

## 🧪 Testing Endpoint Spesifik

Untuk test endpoint tertentu, edit `stress-test.js`:

```javascript
const CONFIG = {
    // ... konfigurasi lain
    endpoint: '/candidates?election=123&page=1&limit=10'
};
```

## 📈 Interpretasi Hasil

### ✅ Hasil Baik
- Success rate > 99%
- Avg response time < 100ms
- Tidak ada error timeout
- P99 < 1000ms

### ⚠️ Perlu Perhatian
- Success rate 95-99%
- Avg response time 100-500ms
- Beberapa error timeout
- P99 1000-2000ms

### ❌ Masalah Serius
- Success rate < 95%
- Avg response time > 500ms
- Banyak error
- P99 > 2000ms
- Server crash/hang

## 🔍 Troubleshooting

### Server Lambat
1. Cek koneksi database
2. Cek penggunaan memory
3. Enable query profiling
4. Add database indexes

### Banyak Timeout
1. Increase timeout di config
2. Reduce concurrent users
3. Optimize database queries
4. Add caching

### Error 500
1. Cek server logs
2. Cek database connection
3. Validate input data
4. Check memory usage

## 💡 Tips

1. **Baseline Test**: Jalankan test ringan dulu untuk baseline
2. **Incremental Load**: Naikkan beban secara bertahap
3. **Monitor Resources**: Pantau CPU, memory, database
4. **Warm Up**: Jalankan beberapa request sebelum test
5. **Multiple Runs**: Jalankan test beberapa kali untuk konsistensi

## 📊 Tools Tambahan

Untuk testing yang lebih advanced, pertimbangkan:

- **Apache JMeter**: GUI-based load testing
- **k6**: Modern load testing tool
- **Artillery**: API load testing
- **wrk**: HTTP benchmarking tool

## 📞 Support

Jika menemukan masalah saat testing:
1. Cek server logs
2. Cek database logs
3. Review error messages
4. Test dengan beban lebih rendah
