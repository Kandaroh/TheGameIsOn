# Phase 1 — Project Scaffold

## Goal
Create the .NET 8 solution, project files, and minimal `Program.cs` that compiles and starts on port 4000 with CORS for `http://localhost:4200`.

## Steps

### 1. Create the solution and project

```powershell
cd <repo-root>
dotnet new sln -n TheGameIsOn -o backend-csharp
cd backend-csharp
dotnet new webapi -n TheGameIsOn.API --no-openapi
dotnet sln add TheGameIsOn.API
dotnet new xunit -n TheGameIsOn.Tests
dotnet sln add TheGameIsOn.Tests
cd TheGameIsOn.Tests
dotnet add reference ../TheGameIsOn.API
cd ..
```

### 2. Clean up the generated WeatherForecast files
Delete `TheGameIsOn.API/Controllers/WeatherForecastController.cs` and `TheGameIsOn.API/WeatherForecast.cs` if they exist.

### 3. Create folder structure inside `TheGameIsOn.API/`

```
Controllers/   (keep, already exists)
Models/
Repositories/
Services/
```

### 4. Replace `Program.cs` with

```csharp
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- JSON serialisation (camelCase to match existing frontend) ---
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// --- DI registrations (filled in Phase 8) ---
// builder.Services.AddSingleton<IStateRepository, StateRepository>();
// ...

var app = builder.Build();

app.UseCors();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "4000";
app.Run($"http://localhost:{port}");
```

### 5. Create `appsettings.json`

```json
{
  "DataRoot": "../backend/data"
}
```

> `DataRoot` points at the existing `backend/data/` so both backends share save files and static JSON.

### 6. Copy or symlink the data folder

For development just use a relative path. The repos will resolve `DataRoot` from configuration.

### 7. Verify

```powershell
cd backend-csharp
dotnet build
dotnet run --project TheGameIsOn.API
# Should print: Now listening on: http://localhost:4000
```

## Deliverables
- `TheGameIsOn.sln`
- `TheGameIsOn.API/TheGameIsOn.API.csproj`
- `TheGameIsOn.API/Program.cs` (compiles, starts, CORS works)
- `TheGameIsOn.Tests/TheGameIsOn.Tests.csproj`
- Empty folders: `Models/`, `Repositories/`, `Services/`
