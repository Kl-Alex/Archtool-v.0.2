package handlers

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

// Форматы: дд.мм.гггг, мм.гггг, qn.гггг, гггг
func isValidDate(v string) bool {
	if v == "" {
		return true
	}
	s := strings.ToLower(strings.TrimSpace(v))
	patterns := []string{
		`^([0-2]\d|3[0-1])\.(0\d|1[0-2])\.\d{4}$`, // dd.mm.yyyy
		`^(0\d|1[0-2])\.\d{4}$`,                   // mm.yyyy
		`^q[1-4]\.\d{4}$`,                        // qn.yyyy
		`^\d{4}$`,                                // yyyy
	}
	for _, pat := range patterns {
		if ok, _ := regexp.MatchString(pat, s); ok {
			return true
		}
	}
	return false
}

func intFromAny(v interface{}) int {
	switch t := v.(type) {
	case float64:
		return int(t)
	case int:
		return t
	case int32:
		return int(t)
	case int64:
		return int(t)
	case string:
		if n, err := strconv.Atoi(t); err == nil {
			return n
		}
	}
	return 0
}

func toString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case int:
		return strconv.FormatInt(int64(t), 10)
	case int32:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}
