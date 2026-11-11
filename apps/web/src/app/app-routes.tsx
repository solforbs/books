import { Navigate, Route, Routes } from "react-router";
import { PublicOnly, RequireSession } from "@/features/auth/components/route-guards";
import { ChangePasswordPage } from "@/features/auth/pages/change-password-page";
import { ChooseBusinessPage } from "@/features/auth/pages/choose-business-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RecoverPage } from "@/features/auth/pages/recover-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { BusinessDetailsPage } from "@/features/business/pages/business-details-page";
import { BulkProductsPage } from "@/features/catalog/pages/bulk-products-page";
import { CategoriesPage } from "@/features/catalog/pages/categories-page";
import { AddProductPage } from "@/features/catalog/pages/add-product-page";
import { EditProductPage } from "@/features/catalog/pages/edit-product-page";
import { ProductDetailPage } from "@/features/catalog/pages/product-detail-page";
import { ProductsPage } from "@/features/catalog/pages/products-page";
import { WaitingPage } from "@/features/catalog/pages/waiting-page";
import { HomePage } from "@/features/home/pages/home-page";
import { LocationsPage } from "@/features/locations/pages/locations-page";
import { MoneyPlacesPage } from "@/features/locations/pages/money-places-page";
import { RequireSettingsAccess } from "@/features/settings/components/require-settings-access";
import { SettingsMenuPage } from "@/features/settings/pages/settings-menu-page";
import { RequireSuppliersAccess } from "@/features/suppliers/components/require-suppliers-access";
import { AddSupplierPage } from "@/features/suppliers/pages/add-supplier-page";
import { EditSupplierPage } from "@/features/suppliers/pages/edit-supplier-page";
import { SupplierDetailPage } from "@/features/suppliers/pages/supplier-detail-page";
import { SuppliersPage } from "@/features/suppliers/pages/suppliers-page";
import { WaitingSuppliersPage } from "@/features/suppliers/pages/waiting-suppliers-page";
import { MainLayout } from "@/features/shell/components/main-layout";
import { AddStaffPage } from "@/features/staff/pages/add-staff-page";
import { StaffDetailPage } from "@/features/staff/pages/staff-detail-page";
import { StaffListPage } from "@/features/staff/pages/staff-list-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/recover"
        element={
          <PublicOnly>
            <RecoverPage />
          </PublicOnly>
        }
      />
      <Route
        path="/change-password"
        element={
          <RequireSession step="change-password">
            <ChangePasswordPage />
          </RequireSession>
        }
      />
      <Route
        path="/choose-business"
        element={
          <RequireSession step="choose-business">
            <ChooseBusinessPage />
          </RequireSession>
        }
      />
      <Route
        element={
          <RequireSession step="home">
            <MainLayout />
          </RequireSession>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<AddProductPage />} />
        <Route path="products/bulk" element={<BulkProductsPage />} />
        <Route path="products/waiting" element={<WaitingPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<EditProductPage />} />
        <Route
          path="suppliers"
          element={
            <RequireSuppliersAccess need="read">
              <SuppliersPage />
            </RequireSuppliersAccess>
          }
        />
        <Route
          path="suppliers/new"
          element={
            <RequireSuppliersAccess need="manage">
              <AddSupplierPage />
            </RequireSuppliersAccess>
          }
        />
        <Route
          path="suppliers/waiting"
          element={
            <RequireSuppliersAccess need="approve">
              <WaitingSuppliersPage />
            </RequireSuppliersAccess>
          }
        />
        <Route
          path="suppliers/:id"
          element={
            <RequireSuppliersAccess need="read">
              <SupplierDetailPage />
            </RequireSuppliersAccess>
          }
        />
        <Route
          path="suppliers/:id/edit"
          element={
            <RequireSuppliersAccess need="manage">
              <EditSupplierPage />
            </RequireSuppliersAccess>
          }
        />
        <Route path="settings" element={<SettingsMenuPage />} />
        <Route
          path="settings/business"
          element={
            <RequireSettingsAccess entry="business">
              <BusinessDetailsPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/locations"
          element={
            <RequireSettingsAccess entry="locations">
              <LocationsPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/money-places"
          element={
            <RequireSettingsAccess entry="moneyPlaces">
              <MoneyPlacesPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/categories"
          element={
            <RequireSettingsAccess entry="categories">
              <CategoriesPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/staff"
          element={
            <RequireSettingsAccess entry="staff">
              <StaffListPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/staff/new"
          element={
            <RequireSettingsAccess entry="staff">
              <AddStaffPage />
            </RequireSettingsAccess>
          }
        />
        <Route
          path="settings/staff/:membershipId"
          element={
            <RequireSettingsAccess entry="staff">
              <StaffDetailPage />
            </RequireSettingsAccess>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
