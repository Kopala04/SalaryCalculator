# Salary Calculator

A modern, responsive salary calculator that computes gross and net pay from worked hours and premium hour categories.

## Features

- Real-time gross & net salary calculations
- Hour category breakdown (regular, night, holiday, overtime, and combinations)
- Editable standard monthly hours (not hardcoded to 176)
- Currency selector ($, €, ₾)
- Dark / light mode
- Input validation with warning messages
- Copy results & reset buttons
- Animated number transitions

## Usage

Open `index.html` in any modern browser — no build step required.

```bash
# Optional: serve locally
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Calculation Logic

**Regular hours** = Total worked hours − (night + holiday + holiday night + overtime + overtime night)

| Category           | Multiplier |
|--------------------|------------|
| Regular            | 1.00×      |
| Night              | 1.40×      |
| Holiday            | 1.25×      |
| Holiday Night      | 1.50×      |
| Overtime           | 2.00×      |
| Overtime Night     | 2.40×      |

**Gross** = sum of all category pays  
**Net** = gross − (gross × tax% / 100)

## Example

| Input | Value |
|-------|-------|
| Hourly rate | $10 |
| Total hours | 180 |
| Night / Holiday / Holiday Night / OT / OT Night | 20 / 10 / 5 / 15 / 5 |
| Tax | 20% |

→ Regular: 125 hrs → **Gross: $2,150** → **Net: $1,720**
