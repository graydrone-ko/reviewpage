// 관리자 대시보드 환불 계산 테스트

function testAdminRefundCalculation() {
    console.log('=== 관리자 대시보드 환불 계산 테스트 ===\n');
    
    // 테스트 케이스: 돼지갈비 테스트
    const testRequest = {
        totalBudget: 55000, // 총 예산
        reward: 1000,       // 개당 리워드
        responses: 1        // 완료된 응답 수
    };
    
    console.log('테스트 케이스: 돼지갈비 테스트');
    console.log(`총 예산: ₩${testRequest.totalBudget.toLocaleString()}`);
    console.log(`개당 리워드: ₩${testRequest.reward.toLocaleString()}`);
    console.log(`완료된 응답: ${testRequest.responses}개\n`);
    
    // 수정된 관리자 계산 로직
    const rewardPerResponse = testRequest.reward;
    const completedResponses = testRequest.responses;
    const maxParticipants = Math.round(testRequest.totalBudget / (rewardPerResponse * 1.1));
    
    const remainingSlots = maxParticipants - completedResponses;
    const refundRewards = remainingSlots * rewardPerResponse;
    const refundFee = refundRewards * 0.1;
    const refundAmount = Math.max(0, refundRewards + refundFee);
    
    console.log('수정된 계산 결과:');
    console.log(`최대 참여자 수: ${maxParticipants}명`);
    console.log(`미진행분: ${remainingSlots}명`);
    console.log(`미진행 리워드: ₩${refundRewards.toLocaleString()}`);
    console.log(`미진행 수수료 (10%): ₩${refundFee.toLocaleString()}`);
    console.log(`총 환불액: ₩${refundAmount.toLocaleString()}`);
    console.log(`\n예상 결과: ₩53,900`);
    console.log(`정확성: ${refundAmount === 53900 ? '✅ 정확' : '❌ 오차'}`);
    
    // 기존 잘못된 계산과 비교
    console.log('\n=== 기존 계산과 비교 ===');
    const totalRewardsPaid = completedResponses * rewardPerResponse;
    const platformFeeRate = 0.05;
    const platformFee = testRequest.totalBudget * platformFeeRate;
    const oldRefundAmount = Math.max(0, testRequest.totalBudget - totalRewardsPaid - platformFee);
    
    console.log('기존 잘못된 계산:');
    console.log(`총 예산: ₩${testRequest.totalBudget.toLocaleString()}`);
    console.log(`지급된 리워드: ₩${totalRewardsPaid.toLocaleString()}`);
    console.log(`플랫폼 수수료 (5%): ₩${platformFee.toLocaleString()}`);
    console.log(`잘못된 환불액: ₩${oldRefundAmount.toLocaleString()}`);
    console.log(`차이: ₩${(refundAmount - oldRefundAmount).toLocaleString()}`);
}

testAdminRefundCalculation();