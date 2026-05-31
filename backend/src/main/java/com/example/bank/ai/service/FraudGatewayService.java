package com.example.bank.ai.service;

import com.example.bank.ai.dto.FraudCheckRequest;
import com.example.bank.ai.dto.FraudCheckResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Locale;

@Service
public class FraudGatewayService {

    private final RestClient restClient;
    private final String fraudApiUrl;

    public FraudGatewayService(
            RestClient.Builder restClientBuilder,
            @Value("${fraud.api.url:http://localhost:8000/api/v1/check}") String fraudApiUrl
    ) {
        this.restClient = restClientBuilder.build();
        this.fraudApiUrl = fraudApiUrl;
    }

    public FraudCheckResponse check(FraudCheckRequest request) {
        try {
            FraudCheckResponse response = restClient.post()
                    .uri(fraudApiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FraudCheckResponse.class);
            if (response != null) {
                return new FraudCheckResponse(response.suspicious(), response.riskScore(), response.reason(), "ml-service");
            }
        } catch (Exception ignored) {
        }
        return localHeuristic(request);
    }

    private FraudCheckResponse localHeuristic(FraudCheckRequest request) {
        String text = request.message().toLowerCase(Locale.ROOT);
        List<String> criticalWords = List.of(
                "оружие", "боеприпасы", "патроны", "взрывчатка",
                "наркотики", "наркота", "закладка", "мефедрон", "героин", "кокаин",
                "проституция", "эскорт", "бордель",
                "отмыв", "взятка", "откат", "терроризм", "экстремизм",
                "поддельные документы", "фальшивые документы", "краденые карты",
                "дроп", "дроппер", "нелегальный товар", "черная бухгалтерия"
        );
        List<String> riskyWords = List.of(
                "crypto", "urgent", "срочно", "пароль", "pin", "казино", "bet", "даркнет",
                "крипта", "криптовалюта", "биткоин", "обнал", "обналичивание",
                "без назначения", "не указывай", "никому не говори", "код из смс", "служба безопасности"
        );
        int criticalMatches = (int) criticalWords.stream().filter(text::contains).count();
        int matches = (int) riskyWords.stream().filter(text::contains).count();
        int amountRisk = request.amount().doubleValue() >= 100_000 ? 45 : request.amount().doubleValue() >= 30_000 ? 20 : 0;
        int score = Math.min(100, criticalMatches * 80 + matches * 20 + amountRisk);
        String reason = criticalMatches > 0
                ? "Назначение платежа содержит слова с запрещенной или криминальной тематикой"
                : score >= 50 ? "Подозрительное назначение платежа" : "Риск низкий";
        return new FraudCheckResponse(score >= 50, score, reason, "local-heuristic");
    }
}
