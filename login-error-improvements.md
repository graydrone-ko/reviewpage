# 로그인 에러 처리 개선사항

## 개선된 에러 메시지

### 1. 사용자를 찾을 수 없는 경우
**기존**: `"Invalid credentials"`  
**개선**: `"등록되지 않은 이메일입니다. 이메일을 확인해주세요."`  
**코드**: `USER_NOT_FOUND`

### 2. 비밀번호가 일치하지 않는 경우
**기존**: `"Invalid credentials"`  
**개선**: `"비밀번호가 일치하지 않습니다. 다시 확인해주세요."`  
**코드**: `INVALID_PASSWORD`

### 3. 입력 검증 오류
**기존**: `"Valid email is required"`, `"Password is required"`  
**개선**: `"올바른 이메일 형식을 입력해주세요."`, `"비밀번호를 입력해주세요."`  
**코드**: `VALIDATION_ERROR`

### 4. 서버 오류
**기존**: `"Internal server error"`  
**개선**: `"로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."`  
**코드**: `SERVER_ERROR`

## 응답 형식 개선

### 기존 형식
```json
{
  "error": "Invalid credentials"
}
```

### 개선된 형식
```json
{
  "error": "등록되지 않은 이메일입니다. 이메일을 확인해주세요.",
  "code": "USER_NOT_FOUND"
}
```

### 검증 오류 형식
```json
{
  "error": "올바른 이메일 형식을 입력해주세요.",
  "code": "VALIDATION_ERROR",
  "field": "email"
}
```

## 프론트엔드 활용 방법

에러 코드를 활용하여 다양한 처리가 가능합니다:

```javascript
try {
  const response = await login(email, password);
} catch (error) {
  if (error.response?.data?.code === 'USER_NOT_FOUND') {
    // 회원가입 안내 또는 이메일 확인 메시지
    showErrorMessage('등록되지 않은 이메일입니다. 회원가입을 진행해주세요.');
  } else if (error.response?.data?.code === 'INVALID_PASSWORD') {
    // 비밀번호 재입력 요청 또는 비밀번호 찾기 안내
    showErrorMessage('비밀번호를 다시 확인해주세요.');
  } else if (error.response?.data?.code === 'VALIDATION_ERROR') {
    // 입력 필드 하이라이트 및 메시지 표시
    highlightField(error.response.data.field);
    showErrorMessage(error.response.data.error);
  }
}
```

## 테스트 시나리오

1. **잘못된 이메일 형식**: `invalid-email` 입력
2. **빈 비밀번호**: 비밀번호 필드를 비워둔 상태
3. **존재하지 않는 사용자**: `nonexistent@test.com`
4. **잘못된 비밀번호**: 올바른 이메일이지만 잘못된 비밀번호
5. **성공적인 로그인**: 올바른 이메일과 비밀번호

## 보안 고려사항

- 사용자 존재 여부와 비밀번호 오류를 구분하여 표시하지만, 이는 사용자 경험 향상을 위함
- 민감한 정보는 로그에만 기록하고 클라이언트에는 전송하지 않음
- 모든 인증 관련 시도는 서버 로그에 상세히 기록됨