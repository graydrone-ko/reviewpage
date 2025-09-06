# 프론트엔드 API URL 수정 방법

## 문제
프론트엔드가 `localhost:3001`로 API 요청을 보내고 있어 Railway 배포 환경에서 연결이 실패합니다.

## 해결 방법

### 1. Railway 환경 변수 설정
Railway 대시보드 → 프로젝트 → Variables 탭에서 추가:

```
REACT_APP_API_URL=https://your-railway-backend-domain.up.railway.app
```

### 2. 또는 프론트엔드 소스 수정 필요
현재 빌드된 파일에 `localhost:3001`이 하드코딩되어 있으므로, 원본 소스코드에서:

```javascript
// 기존
const API_BASE_URL = 'http://localhost:3001/api';

// 수정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

### 3. Railway 백엔드 도메인 확인
Railway 대시보드에서 백엔드 서비스의 실제 도메인을 확인하고 위 환경 변수에 설정하세요.

## 현재 상태
- 백엔드: 정상 작동 ✅
- 데이터베이스: 사용자 계정 생성 완료 ✅  
- 문제: 프론트엔드 → 백엔드 연결 실패 ❌

## 로그인 테스트 계정
- 관리자: graydrone@naver.com / 7300gray
- 판매자: seller@test.com / test123  
- 소비자: cunsumer@test.com / test123