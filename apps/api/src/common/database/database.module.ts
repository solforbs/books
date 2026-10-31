import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { APP_CONFIG, type AppConfig } from "../../config/app-config";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        uri: config.MONGODB_URI,
        // Fail requests quickly when the database is unreachable instead of hanging.
        serverSelectionTimeoutMS: 5_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
