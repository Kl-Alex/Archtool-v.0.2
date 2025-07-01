package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"io"
	"fmt"

	"github.com/gin-gonic/gin"
)

type AssistantRequest struct {
	Prompt string `json:"prompt"`
}

type AssistantResponse struct {
	Answer string `json:"answer"`
}

func AssistantHandler(c *gin.Context) {
	var req AssistantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	answer, err := callLLM(req.Prompt)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, AssistantResponse{Answer: answer})
}
func callLLM(prompt string) (string, error) {
	body := map[string]interface{}{
		"model": "llama3",
		"prompt": prompt,
		"stream": false,
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "http://localhost:11434/api/generate", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("LLM returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Response string `json:"response"` // для Ollama
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Response == "" {
		return "", fmt.Errorf("empty response from LLM")
	}

	return result.Response, nil
}
